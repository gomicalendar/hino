#!/usr/bin/env python3
"""hino-gomi-dl の PDF を hino-gomi-py で変換し、public/<西暦>/ に反映する。

「前回どの入力から生成したか」を .github/state/source.json に記録しておき、
今回の入力の指紋と突き合わせて、変化したときだけ変換を走らせる。

指紋は日付ではなく内容（PDF の sha256 と変換スクリプトの sha256）なので、

  - 平常時は数秒で「変更なし」と出て終わる
  - GitHub 障害などで数日実行できなくても、次に動いたときに正しく走る
  - 同じ PDF を再ダウンロードしただけの日は走らない
  - 変換ロジックを直したときは PDF が同じでも再生成される

manifest.json の fetched_at / downloaded_at は毎回変わるため指紋には含めない。
含めると毎日差分が出て、毎日フル変換することになる。
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def read_fingerprint(data_dir: Path, converter: Path) -> dict:
    """data/<版>/manifest.json から、比較に使う部分だけを取り出す。"""
    editions: dict[str, dict[str, str]] = {}
    for manifest_path in sorted(data_dir.glob("*/manifest.json")):
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        edition = manifest.get("edition") or manifest_path.parent.name
        files = manifest.get("files")
        if not files:
            raise SystemExit(f"[error] {manifest_path} に files がありません")
        try:
            editions[edition] = {name: meta["sha256"] for name, meta in sorted(files.items())}
        except KeyError:
            raise SystemExit(f"[error] {manifest_path} に sha256 の無いファイルがあります") from None

    if not editions:
        raise SystemExit(f"[error] {data_dir} に <版>/manifest.json がありません")

    script = converter / "hino_gomi.py"
    if not script.is_file():
        raise SystemExit(f"[error] {script} がありません")

    # commit SHA ではなく変換スクリプト自体の hash を使う。
    # README の修正だけで再生成が走るのを避けられる。
    return {"editions": editions, "converter": sha256_of(script)}


def editions_to_build(current: dict, previous: dict | None) -> list[str]:
    """再変換が要る版を返す。変換スクリプトが変わっていれば全部。"""
    if previous is None:
        return sorted(current["editions"])
    if previous.get("converter") != current["converter"]:
        return sorted(current["editions"])
    old = previous.get("editions", {})
    return sorted(ed for ed, files in current["editions"].items() if old.get(ed) != files)


def convert(converter: Path, edition_dir: Path, outdir: Path) -> None:
    cmd = [sys.executable, str(converter / "hino_gomi.py"), str(edition_dir), "-o", str(outdir)]
    print(f"$ {' '.join(cmd)}", flush=True)
    subprocess.run(cmd, check=True)


def publish(outdir: Path, public: Path) -> list[int]:
    """出力の年フォルダを public/<西暦>/ へ反映する。

    触るのは今回生成した年だけ。過去年は購読中の .ics があるので消さない。
    """
    years = []
    for src in sorted(outdir.glob("[0-9][0-9][0-9][0-9]")):
        if not src.is_dir():
            continue
        dst = public / src.name
        # 地区が減った場合に古いファイルが残らないよう、その年だけ作り直す
        if dst.exists():
            shutil.rmtree(dst)
        shutil.copytree(src, dst)
        years.append(int(src.name))
        print(f"[OK] public/{src.name}/  {len(list(dst.iterdir()))} ファイル")
    if not years:
        raise SystemExit(f"[error] {outdir} に年フォルダが生成されませんでした")
    return years


def emit_output(**kv: object) -> None:
    """GitHub Actions の step output に渡す（ローカル実行では何もしない）。"""
    import os

    path = os.environ.get("GITHUB_OUTPUT")
    if not path:
        return
    with open(path, "a", encoding="utf-8") as f:
        for key, value in kv.items():
            f.write(f"{key}={value}\n")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--data", required=True, type=Path, help="hino-gomi-dl の data/")
    parser.add_argument("--converter", required=True, type=Path, help="hino-gomi-py のチェックアウト先")
    parser.add_argument("--public", type=Path, default=REPO / "public", help="出力先（既定: public/）")
    parser.add_argument("--state", type=Path, default=REPO / ".github/state/source.json",
                        help="指紋の記録先（既定: .github/state/source.json）")
    parser.add_argument("--force", action="store_true", help="指紋が一致していても再生成する")
    parser.add_argument("--check", action="store_true", help="判定だけして生成しない")
    args = parser.parse_args(argv)

    current = read_fingerprint(args.data, args.converter)
    previous = json.loads(args.state.read_text(encoding="utf-8")) if args.state.is_file() else None

    targets = sorted(current["editions"]) if args.force else editions_to_build(current, previous)

    if not targets:
        print("変更なし（前回と同じ PDF・同じ変換スクリプトです）")
        emit_output(updated="false", editions="")
        return 0

    reason = "初回" if previous is None else (
        "変換スクリプトが更新されました" if previous.get("converter") != current["converter"]
        else "PDF が更新されました")
    print(f"再生成します（{reason}）: {', '.join(targets)}")

    if args.check:
        emit_output(updated="true", editions=" ".join(targets))
        return 0

    with tempfile.TemporaryDirectory() as tmp:
        outdir = Path(tmp)
        for edition in targets:
            convert(args.converter, args.data / edition, outdir)
        years = publish(outdir, args.public)

    args.state.parent.mkdir(parents=True, exist_ok=True)
    state = dict(current, generated_at=datetime.now(timezone.utc).isoformat(timespec="seconds"))
    args.state.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"[OK] {args.state.relative_to(REPO) if args.state.is_relative_to(REPO) else args.state}")

    emit_output(updated="true", editions=" ".join(targets), years=" ".join(str(y) for y in years))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

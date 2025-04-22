import sys
import PyInstaller.__main__

APP_NAME = "RedactShotX"
SPACY_MODEL = "en_core_web_trf"


def build_mac():
    PyInstaller.__main__.run(
        [
            "main.py",
            f"--name={APP_NAME}",
            "--onefile",
            "--windowed",
            "--icon=assets/icon.icns",
            f"--add-data={SPACY_MODEL}:{SPACY_MODEL}",
            f"--add-data=dist-web:dist-web",
            "--hidden-import=presidio_analyzer",
            "--hidden-import=presidio_image_redactor",
            "--hidden-import=spacy",
            "--hidden-import=en_core_web_trf",
            "--collect-all=presidio_analyzer",
            "--collect-all=presidio_image_redactor",
            "--collect-all=spacy",
            "--collect-all=en_core_web_trf",
        ]
    )


if __name__ == "__main__":
    if len(sys.argv) < 3 and "--target" not in sys.argv:
        print("Usage: python build.py --target mac")
        sys.exit(1)

    target = sys.argv[2]
    if target == "mac":
        print("🏗 Building for macOS...")
        build_mac()
    else:
        print(f"❌ Unsupported target: {target}")

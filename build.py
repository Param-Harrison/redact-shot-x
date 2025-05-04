import sys
import PyInstaller.__main__
import os
import shutil
import spacy
from pathlib import Path

APP_NAME = "RedactShotX"
SPACY_MODEL = "en_core_web_trf"


def ensure_spacy_model():
    """Ensure the required spaCy model is downloaded and copied to the project root."""
    try:
        # Try to load the model to check if it exists
        nlp = spacy.load(SPACY_MODEL)
        print(f"✅ {SPACY_MODEL} model found")

        # Get the model's location
        model_path = Path(nlp.path)
        target_path = Path(SPACY_MODEL)

        # If the model is not in the project root, copy it there
        if not target_path.exists():
            print(f"⚠️ Copying {SPACY_MODEL} to project root...")
            shutil.copytree(model_path, target_path)
            print(f"✅ {SPACY_MODEL} copied to project root")
    except OSError:
        print(f"⚠️ {SPACY_MODEL} model not found. Downloading...")
        spacy.cli.download(SPACY_MODEL)
        print(f"✅ {SPACY_MODEL} model downloaded successfully")

        # After download, load it again to get its path
        nlp = spacy.load(SPACY_MODEL)
        model_path = Path(nlp.path)
        target_path = Path(SPACY_MODEL)

        # Copy to project root
        print(f"⚠️ Copying {SPACY_MODEL} to project root...")
        shutil.copytree(model_path, target_path)
        print(f"✅ {SPACY_MODEL} copied to project root")


def build_mac():
    ensure_spacy_model()

    PyInstaller.__main__.run(
        [
            "main.py",
            f"--name={APP_NAME}",
            "--windowed",
            "--icon=assets/icon.icns",
            f"--add-data={SPACY_MODEL}:{SPACY_MODEL}",
            f"--add-data=dist-web:dist-web",
            "--hidden-import=presidio_analyzer",
            "--hidden-import=presidio_image_redactor",
            "--hidden-import=spacy",
            "--hidden-import=en_core_web_trf",
            "--hidden-import=pystray",
            "--hidden-import=PIL",
            "--hidden-import=AppKit",
            "--hidden-import=Foundation",
            "--hidden-import=uvicorn",
            "--hidden-import=fastapi",
            "--hidden-import=multiprocessing",
            "--collect-all=presidio_analyzer",
            "--collect-all=presidio_image_redactor",
            "--collect-all=spacy",
            "--collect-all=en_core_web_trf",
            "--collect-all=pystray",
            "--collect-all=PIL",
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

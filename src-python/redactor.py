# redactor.py
import json
import base64
import logging
from io import BytesIO
from typing import Optional

from PIL import Image
from presidio_analyzer import AnalyzerEngine
from presidio_analyzer.nlp_engine import NlpEngineProvider
from presidio_image_redactor import ImageRedactorEngine
from presidio_image_redactor.image_analyzer_engine import ImageAnalyzerEngine

logger = logging.getLogger("redactor")
logging.basicConfig(level=logging.INFO)


class ImageRedactor:
    def __init__(self):
        logger.info("🔍 Initializing ImageRedactor with default config")
        # Set up the NLP engine with default spaCy config
        provider = NlpEngineProvider(
            nlp_configuration={
                "nlp_engine_name": "spacy",
                "models": [{"lang_code": "en", "model_name": "en_core_web_lg"}],
            }
        )
        nlp_engine = provider.create_engine()

        self.analyzer = AnalyzerEngine(
            nlp_engine=nlp_engine,
            supported_languages=["en"],
        )
        self.image_analyzer = ImageAnalyzerEngine(self.analyzer)
        self.image_redactor = ImageRedactorEngine()

    def redact_image(self, image_path: str) -> str:
        logger.info(f"🖼️ Redacting image: {image_path}")
        image = Image.open(image_path)

        results = self.image_analyzer.analyze(image=image)

        redacted = self.image_redactor.redact(image=image, fill="contrast")  # blur fill
        output_path = image_path.replace(".", "-redacted.")

        redacted.save(output_path)
        logger.info(f"✅ Saved redacted image to: {output_path}")

        return json.dumps(
            {
                "success": True,
                "outputPath": output_path,
                "redactionCount": len(results),
            }
        )

    def redact_image_base64(self, base64_data: str) -> str:
        logger.info("🧠 Redacting base64 image")
        image_data = base64.b64decode(
            base64_data.split(",")[1] if "," in base64_data else base64_data
        )
        image = Image.open(BytesIO(image_data))

        results = self.image_analyzer.analyze(image=image)

        redacted = self.image_redactor.redact(image=image, fill=None)

        buffered = BytesIO()
        redacted.save(buffered, format="PNG")
        redacted_base64 = base64.b64encode(buffered.getvalue()).decode()

        return json.dumps(
            {
                "success": True,
                "redactedImage": f"data:image/png;base64,{redacted_base64}",
                "redactionCount": len(results),
            }
        )

import json
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import (
    APIRouter,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
)

from app.services.face_recognition import (
    recognize_worker,
)

from app.services.safety_detector import (
    detect_safety_gear,
)


router = APIRouter()


BACKEND_ROOT = (
    Path(__file__)
    .resolve()
    .parents[2]
)

UPLOAD_DIR = (
    BACKEND_ROOT
    / "uploads"
)

UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


ALLOWED_IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
}


def save_uploaded_image(
    uploaded_file: UploadFile,
) -> Path:
    original_filename = (
        uploaded_file.filename
        or "scan.jpg"
    )

    file_extension = Path(
        original_filename
    ).suffix.lower()

    if (
        file_extension
        not in ALLOWED_IMAGE_EXTENSIONS
    ):
        file_extension = ".jpg"

    timestamp = (
        datetime.now().strftime(
            "%Y%m%d_%H%M%S_%f"
        )
    )

    filename = (
        f"{timestamp}_scan"
        f"{file_extension}"
    )

    image_path = (
        UPLOAD_DIR / filename
    )

    try:
        with image_path.open(
            "wb"
        ) as destination:
            shutil.copyfileobj(
                uploaded_file.file,
                destination,
            )

    except Exception as error:
        if image_path.exists():
            image_path.unlink()

        raise HTTPException(
            status_code=500,
            detail=(
                "The uploaded scan "
                "could not be saved."
            ),
        ) from error

    if (
        not image_path.exists()
        or image_path.stat().st_size
        == 0
    ):
        if image_path.exists():
            image_path.unlink()

        raise HTTPException(
            status_code=400,
            detail=(
                "The uploaded scan was empty."
            ),
        )

    return image_path


def parse_required_gear(
    required_gear_json: str | None,
) -> list[str]:
    if not required_gear_json:
        return []

    try:
        parsed_value: Any = json.loads(
            required_gear_json
        )

    except json.JSONDecodeError as error:
        raise HTTPException(
            status_code=400,
            detail=(
                "required_gear must be "
                "a valid JSON list."
            ),
        ) from error

    if not isinstance(
        parsed_value,
        list,
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "required_gear must be "
                "a JSON list."
            ),
        )

    required_gear: list[str] = []

    for item in parsed_value:
        cleaned_item = str(
            item
        ).strip()

        if (
            cleaned_item
            and cleaned_item
            not in required_gear
        ):
            required_gear.append(
                cleaned_item
            )

    return required_gear


@router.post("/scan")
async def scan_image(
    request: Request,
    file: UploadFile = File(...),
    required_gear: str | None = Form(
        default=None
    ),
):
    """
    Restore the previous accurate behavior.

    Face recognition runs first with RetinaFace and DeepFace.verify.
    PPE detection runs afterward.
    """
    image_path = save_uploaded_image(
        file
    )

    submitted_required_gear = (
        parse_required_gear(
            required_gear
        )
    )

    face_result = recognize_worker(
        str(image_path)
    )

    safety_result = detect_safety_gear(
        image_path=str(image_path),
        required_gear=(
            submitted_required_gear
        ),
    )

    image_url = str(
        request.url_for(
            "uploaded_scan",
            path=image_path.name,
        )
    )

    return {
        **safety_result,
        **face_result,
        "image_url": image_url,
        "required_gear": (
            safety_result.get(
                "required_gear",
                submitted_required_gear,
            )
        ),
    }


@router.get("/scan/test")
def scan_test():
    return {
        "status": "ok",
        "message": (
            "Scan route is working."
        ),
    }
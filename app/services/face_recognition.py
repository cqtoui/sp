import json
import math
import time
from pathlib import Path
from typing import Any

from deepface import DeepFace
from PIL import Image, UnidentifiedImageError


BACKEND_ROOT = Path(__file__).resolve().parents[2]

WORKER_DATA_DIR = (
    BACKEND_ROOT
    / "worker_data"
)

FACE_DATABASE = (
    WORKER_DATA_DIR
    / "faces"
)

WORKERS_FILE = (
    WORKER_DATA_DIR
    / "workers.json"
)

EMBEDDINGS_CACHE_FILE = (
    WORKER_DATA_DIR
    / "face_embeddings.json"
)


MODEL_NAME = "Facenet512"

# Keep RetinaFace for the accuracy you had before.
DETECTOR_BACKEND = "retinaface"

# Facenet512 cosine matching threshold.
# Lower is stricter. Start with 0.30.
MATCH_THRESHOLD = 0.30


ALLOWED_IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
}


def unknown_worker(
    status: str,
    recognition_time_seconds: float = 0,
    face_distance: float | None = None,
) -> dict[str, Any]:
    return {
        "worker_identified": "Unknown Worker",
        "worker_id": "",
        "employee_id": "",
        "department": "",
        "face_recognition_status": status,
        "face_distance": (
            round(face_distance, 4)
            if face_distance is not None
            else None
        ),
        "face_threshold": MATCH_THRESHOLD,
        "face_recognition_time_seconds": round(
            recognition_time_seconds,
            2,
        ),
    }


def load_workers() -> list[dict[str, Any]]:
    if not WORKERS_FILE.exists():
        return []

    try:
        workers = json.loads(
            WORKERS_FILE.read_text(
                encoding="utf-8",
            )
        )

        if not isinstance(workers, list):
            print(
                "workers.json must contain a JSON list."
            )
            return []

        return workers

    except (
        json.JSONDecodeError,
        OSError,
    ) as error:
        print(
            "Could not load workers:",
            f"{type(error).__name__}: {error}",
        )
        return []


def load_embedding_cache() -> dict[str, Any]:
    if not EMBEDDINGS_CACHE_FILE.exists():
        return {}

    try:
        cache = json.loads(
            EMBEDDINGS_CACHE_FILE.read_text(
                encoding="utf-8",
            )
        )

        if isinstance(cache, dict):
            return cache

        return {}

    except (
        json.JSONDecodeError,
        OSError,
    ) as error:
        print(
            "Could not load embedding cache:",
            f"{type(error).__name__}: {error}",
        )
        return {}


def save_embedding_cache(
    cache: dict[str, Any],
) -> None:
    WORKER_DATA_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    temporary_file = (
        EMBEDDINGS_CACHE_FILE
        .with_suffix(".tmp")
    )

    temporary_file.write_text(
        json.dumps(
            cache,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    temporary_file.replace(
        EMBEDDINGS_CACHE_FILE
    )


def is_valid_image(
    image_path: Path,
) -> bool:
    if not image_path.exists():
        return False

    if not image_path.is_file():
        return False

    if (
        image_path.suffix.lower()
        not in ALLOWED_IMAGE_EXTENSIONS
    ):
        return False

    try:
        with Image.open(
            image_path
        ) as image:
            image.verify()

        return True

    except (
        UnidentifiedImageError,
        OSError,
        ValueError,
    ):
        return False


def is_no_face_error(
    error: Exception,
) -> bool:
    message = str(error).lower()

    no_face_messages = (
        "face could not be detected",
        "face cannot be detected",
        "no face detected",
        "no face",
        "could not detect face",
        "cannot detect face",
        "confirm that the picture is a face photo",
        "consider to set enforce_detection",
    )

    return any(
        text in message
        for text in no_face_messages
    )


def generate_embedding(
    image_path: Path,
) -> list[float]:
    """
    Detect, align, and represent one face using RetinaFace and Facenet512.

    This is the expensive operation. Registered-worker embeddings are cached,
    so this normally runs only once for the live scan.
    """
    representations = DeepFace.represent(
        img_path=str(image_path),
        model_name=MODEL_NAME,
        detector_backend=DETECTOR_BACKEND,
        enforce_detection=True,
        align=True,
        normalization="base",
    )

    if not representations:
        raise ValueError(
            "No face representation was generated."
        )

    # Reject images containing multiple faces.
    if len(representations) > 1:
        raise ValueError(
            "Multiple faces detected. Please scan one person at a time."
        )

    embedding = representations[0].get(
        "embedding"
    )

    if not isinstance(
        embedding,
        list,
    ):
        raise ValueError(
            "The generated face embedding is invalid."
        )

    if not embedding:
        raise ValueError(
            "The generated face embedding is empty."
        )

    return [
        float(value)
        for value in embedding
    ]


def cosine_distance(
    first_embedding: list[float],
    second_embedding: list[float],
) -> float:
    if (
        not first_embedding
        or not second_embedding
    ):
        return 1.0

    if (
        len(first_embedding)
        != len(second_embedding)
    ):
        return 1.0

    dot_product = sum(
        first_value * second_value
        for first_value, second_value
        in zip(
            first_embedding,
            second_embedding,
        )
    )

    first_norm = math.sqrt(
        sum(
            value * value
            for value in first_embedding
        )
    )

    second_norm = math.sqrt(
        sum(
            value * value
            for value in second_embedding
        )
    )

    if (
        first_norm == 0
        or second_norm == 0
    ):
        return 1.0

    similarity = (
        dot_product
        / (
            first_norm
            * second_norm
        )
    )

    return float(
        1 - similarity
    )


def get_worker_embedding(
    worker: dict[str, Any],
    cache: dict[str, Any],
) -> tuple[list[float] | None, bool]:
    """
    Return a cached worker embedding.

    The embedding is regenerated automatically when the worker photograph
    changes, based on its modification timestamp.
    """
    photo_filename = worker.get(
        "photo_filename"
    )

    if not photo_filename:
        return None, False

    photo_path = (
        FACE_DATABASE
        / str(photo_filename)
    )

    if not is_valid_image(
        photo_path
    ):
        print(
            "Skipping invalid worker photograph:",
            photo_path,
        )
        return None, False

    modification_time = (
        photo_path.stat().st_mtime_ns
    )

    cached_item = cache.get(
        str(photo_filename)
    )

    if isinstance(
        cached_item,
        dict,
    ):
        cached_modification_time = (
            cached_item.get(
                "modification_time"
            )
        )

        cached_embedding = (
            cached_item.get(
                "embedding"
            )
        )

        if (
            cached_modification_time
            == modification_time
            and isinstance(
                cached_embedding,
                list,
            )
            and cached_embedding
        ):
            return (
                [
                    float(value)
                    for value
                    in cached_embedding
                ],
                False,
            )

    print(
        "Creating face embedding for:",
        worker.get(
            "full_name",
            "Unnamed Worker",
        ),
    )

    try:
        embedding = generate_embedding(
            photo_path
        )

    except Exception as error:
        print(
            "Could not create worker embedding:",
            worker.get(
                "full_name",
                "Unnamed Worker",
            ),
            f"{type(error).__name__}: {error}",
        )

        return None, False

    cache[str(photo_filename)] = {
        "worker_id": worker.get(
            "id",
            "",
        ),
        "photo_filename": str(
            photo_filename
        ),
        "modification_time": (
            modification_time
        ),
        "model_name": MODEL_NAME,
        "detector_backend": (
            DETECTOR_BACKEND
        ),
        "embedding": embedding,
    }

    return embedding, True


def remove_stale_cache_entries(
    workers: list[dict[str, Any]],
    cache: dict[str, Any],
) -> bool:
    valid_filenames = {
        str(
            worker.get(
                "photo_filename"
            )
        )
        for worker in workers
        if worker.get(
            "photo_filename"
        )
    }

    stale_filenames = [
        filename
        for filename in cache
        if filename
        not in valid_filenames
    ]

    for filename in stale_filenames:
        cache.pop(
            filename,
            None,
        )

    return bool(
        stale_filenames
    )


def recognize_worker(
    image_path: str,
) -> dict[str, Any]:
    """
    Accurate recognition with cached worker embeddings.

    RetinaFace and Facenet512 run once on the live scan. Stored workers are
    compared using their cached numerical embeddings.
    """
    started_at = (
        time.perf_counter()
    )

    scan_path = Path(
        image_path
    )

    if not is_valid_image(
        scan_path
    ):
        elapsed = (
            time.perf_counter()
            - started_at
        )

        return unknown_worker(
            "Uploaded file is not a valid image",
            elapsed,
        )

    workers = load_workers()

    active_workers = [
        worker
        for worker in workers
        if str(
            worker.get(
                "status",
                "active",
            )
        ).lower()
        == "active"
    ]

    if not active_workers:
        elapsed = (
            time.perf_counter()
            - started_at
        )

        return unknown_worker(
            "No active workers registered",
            elapsed,
        )

    try:
        scan_embedding = generate_embedding(
            scan_path
        )

    except ValueError as error:
        elapsed = (
            time.perf_counter()
            - started_at
        )

        if (
            is_no_face_error(error)
            or "no face representation"
            in str(error).lower()
        ):
            return unknown_worker(
                "No clear face detected",
                elapsed,
            )

        if (
            "multiple faces"
            in str(error).lower()
        ):
            return unknown_worker(
                "Multiple faces detected",
                elapsed,
            )

        print(
            "Scan embedding ValueError:",
            error,
        )

        return unknown_worker(
            "Face recognition could not complete",
            elapsed,
        )

    except Exception as error:
        elapsed = (
            time.perf_counter()
            - started_at
        )

        if is_no_face_error(
            error
        ):
            return unknown_worker(
                "No clear face detected",
                elapsed,
            )

        print(
            "Scan embedding error:",
            f"{type(error).__name__}: {error}",
        )

        return unknown_worker(
            "Face recognition error",
            elapsed,
        )

    cache = load_embedding_cache()

    cache_changed = remove_stale_cache_entries(
        active_workers,
        cache,
    )

    best_worker: dict[str, Any] | None = None
    best_distance: float | None = None

    valid_embedding_count = 0

    for worker in active_workers:
        worker_embedding, embedding_created = (
            get_worker_embedding(
                worker,
                cache,
            )
        )

        if embedding_created:
            cache_changed = True

        if worker_embedding is None:
            continue

        valid_embedding_count += 1

        distance = cosine_distance(
            scan_embedding,
            worker_embedding,
        )

        print(
            "Face comparison:",
            worker.get(
                "full_name",
                "Unnamed Worker",
            ),
            f"distance={distance:.4f}",
            f"threshold={MATCH_THRESHOLD}",
        )

        if (
            best_distance is None
            or distance < best_distance
        ):
            best_worker = worker
            best_distance = distance

    if cache_changed:
        try:
            save_embedding_cache(
                cache
            )
        except OSError as error:
            print(
                "Could not save embedding cache:",
                error,
            )

    elapsed = (
        time.perf_counter()
        - started_at
    )

    if valid_embedding_count == 0:
        return unknown_worker(
            "No valid worker photographs registered",
            elapsed,
        )

    if (
        best_worker is None
        or best_distance is None
    ):
        return unknown_worker(
            "No matching face found",
            elapsed,
        )

    if best_distance > MATCH_THRESHOLD:
        return unknown_worker(
            "No matching face found",
            elapsed,
            best_distance,
        )

    print(
        "Worker matched:",
        best_worker.get(
            "full_name",
            "Unknown Worker",
        ),
        f"distance={best_distance:.4f}",
        f"time={elapsed:.2f}s",
    )

    return {
        "worker_identified": (
            best_worker.get(
                "full_name",
                "Unknown Worker",
            )
        ),
        "worker_id": (
            best_worker.get(
                "id",
                "",
            )
        ),
        "employee_id": (
            best_worker.get(
                "employee_id",
                "",
            )
        ),
        "department": (
            best_worker.get(
                "department",
                "",
            )
        ),
        "face_recognition_status": (
            "Matched"
        ),
        "face_distance": round(
            best_distance,
            4,
        ),
        "face_threshold": (
            MATCH_THRESHOLD
        ),
        "face_recognition_time_seconds": round(
            elapsed,
            2,
        ),
    }
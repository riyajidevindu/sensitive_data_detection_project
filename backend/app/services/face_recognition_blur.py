from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Iterable, Optional, Sequence, Tuple

import cv2
import numpy as np

logger = logging.getLogger(__name__)


class FaceRecognitionBlurError(RuntimeError):
    """Raised when selective blurring cannot be completed."""


def _ensure_kernel_size(value: int | None, fallback: int) -> int:
    kernel = fallback if value is None else int(value)
    kernel = max(3, kernel)
    if kernel % 2 == 0:
        kernel += 1
    return kernel


def _load_image_with_fallback(path: str | os.PathLike[str]) -> np.ndarray:
    image = cv2.imread(str(path))
    if image is None:
        raise FaceRecognitionBlurError(f"Failed to load image at '{path}'. Ensure the path is correct and the file is a valid image.")
    return image


def _load_default_cascade() -> cv2.CascadeClassifier:
    cascade_path = Path(cv2.data.haarcascades) / "haarcascade_frontalface_default.xml"
    classifier = cv2.CascadeClassifier(str(cascade_path))
    if classifier.empty():
        raise FaceRecognitionBlurError(
            "OpenCV Haar cascade could not be loaded. Ensure opencv-data is available."
        )
    return classifier


def _normalize_embedding(vector: np.ndarray) -> np.ndarray:
    norm = float(np.linalg.norm(vector))
    if norm == 0.0:
        raise FaceRecognitionBlurError("Encountered a face crop with zero variance; cannot compute embedding.")
    return vector / norm


def _compute_embedding(face_gray: np.ndarray) -> np.ndarray:
    if face_gray.size == 0:
        raise FaceRecognitionBlurError("Cannot compute embedding for an empty face crop.")

    resized = cv2.resize(face_gray, (128, 128), interpolation=cv2.INTER_LINEAR)
    equalized = cv2.equalizeHist(resized)
    flattened = equalized.astype(np.float32).reshape(-1)
    flattened -= float(flattened.mean())
    return _normalize_embedding(flattened)


def _to_rectangles(faces: Sequence[Tuple[int, int, int, int]]) -> list[tuple[int, int, int, int]]:
    return [(int(x), int(y), int(w), int(h)) for (x, y, w, h) in faces]


class FaceRecognitionBlur:
    """Provides face-similarity-assisted selective blurring utilities."""

    def __init__(self, tolerance: float = 0.75) -> None:
        self._encoding: Optional[np.ndarray] = None
        self.tolerance = tolerance
        self._detector = _load_default_cascade()

    @property
    def has_reference(self) -> bool:
        return self._encoding is not None

    @property
    def reference_encoding(self) -> np.ndarray:
        if self._encoding is None:
            raise FaceRecognitionBlurError("A reference face has not been loaded yet. Call 'load_reference_image' first.")
        return self._encoding

    def _detect_faces(self, image_gray: np.ndarray) -> list[tuple[int, int, int, int]]:
        detections = self._detector.detectMultiScale(
            image_gray,
            scaleFactor=1.1,
            minNeighbors=5,
            flags=cv2.CASCADE_SCALE_IMAGE,
            minSize=(60, 60),
        )
        return _to_rectangles(detections)

    @staticmethod
    def _select_primary_face(faces: Sequence[tuple[int, int, int, int]]) -> tuple[int, int, int, int]:
        if not faces:
            raise FaceRecognitionBlurError(
                "No face detected in the reference image. Please upload a clear image containing exactly one face."
            )

        if len(faces) > 1:
            logger.warning("Multiple faces detected in reference image. Using the largest detected face.")

        return max(faces, key=lambda rect: rect[2] * rect[3])

    def load_reference_image(self, image_path: str | os.PathLike[str]) -> np.ndarray:
        """Load a reference image, extract a face embedding, and store it for future comparisons."""
        logger.debug("Loading reference image from %s", image_path)
        image_bgr = _load_image_with_fallback(image_path)
        image_gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)

        faces = self._detect_faces(image_gray)
        x, y, w, h = self._select_primary_face(faces)
        face_crop = image_gray[y : y + h, x : x + w]

        self._encoding = _compute_embedding(face_crop)
        logger.info("Stored reference face embedding from %s", image_path)
        return self._encoding

    def load_reference_encoding(self, encoding_path: str | os.PathLike[str]) -> np.ndarray:
        """Load a previously saved reference encoding (.npy file)."""
        path = Path(encoding_path)
        if not path.exists():
            raise FaceRecognitionBlurError(f"Reference encoding file '{encoding_path}' does not exist.")

        encoding = np.load(path)
        if encoding.ndim != 1:
            raise FaceRecognitionBlurError("Loaded encoding does not appear to be a valid face encoding vector.")

        self._encoding = encoding.astype(np.float32)
        logger.info("Loaded reference face encoding from %s", encoding_path)
        return self._encoding

    def save_reference_encoding(self, encoding_path: str | os.PathLike[str]) -> Path:
        """Persist the currently stored encoding to disk."""
        if self._encoding is None:
            raise FaceRecognitionBlurError("No reference encoding to save. Load a reference first.")

        path = Path(encoding_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        np.save(path, self._encoding)
        logger.info("Saved reference face encoding to %s", path)
        return path

    def selective_blur_image(
        self,
        image_path: str | os.PathLike[str],
        output_path: str | os.PathLike[str] | None = None,
        *,
        tolerance: Optional[float] = None,
        blur_kernel: int = 51,
    ) -> np.ndarray:
        """Blur all faces except the stored reference face in the provided image."""
        if self._encoding is None:
            raise FaceRecognitionBlurError("Reference encoding missing. Load a reference face before processing images.")

        kernel = _ensure_kernel_size(blur_kernel, 51)
        image_bgr = _load_image_with_fallback(image_path)
        image_gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)

        logger.debug("Detecting faces in %s", image_path)
        rectangles = self._detect_faces(image_gray)

        if not rectangles:
            logger.warning("No faces detected in %s", image_path)

        effective_tolerance = self.tolerance if tolerance is None else tolerance

        for (x, y, w, h) in rectangles:
            face_region_gray = image_gray[y : y + h, x : x + w]
            face_region_bgr = image_bgr[y : y + h, x : x + w]

            if face_region_gray.size == 0 or face_region_bgr.size == 0:
                logger.debug("Skipping empty face region at (%s, %s, %s, %s)", x, y, w, h)
                continue

            try:
                embedding = _compute_embedding(face_region_gray)
            except FaceRecognitionBlurError as exc:
                logger.debug("Failed to compute embedding for face at (%s, %s, %s, %s): %s", x, y, w, h, exc)
                embedding = None

            if embedding is not None:
                similarity = float(np.dot(self.reference_encoding, embedding))
                if similarity >= effective_tolerance:
                    logger.debug(
                        "Found a matching face (similarity=%.3f) that will remain unblurred at position (%s, %s, %s, %s)",
                        similarity,
                        x,
                        y,
                        w,
                        h,
                    )
                    continue

            blurred = cv2.GaussianBlur(face_region_bgr, (kernel, kernel), 0)
            image_bgr[y : y + h, x : x + w] = blurred
            logger.debug("Blurred non-matching face at (%s, %s, %s, %s)", x, y, w, h)

        if output_path is not None:
            out_path = Path(output_path)
            out_path.parent.mkdir(parents=True, exist_ok=True)
            cv2.imwrite(str(out_path), image_bgr)
            logger.info("Saved selectively blurred image to %s", out_path)

        return image_bgr

    def process_images(
        self,
        image_paths: Iterable[str | os.PathLike[str]],
        output_dir: str | os.PathLike[str],
        *,
        tolerance: Optional[float] = None,
        blur_kernel: int = 51,
        suffix: str = "_blurred",
    ) -> list[Path]:
        """Process multiple images, saving outputs alongside originals in the given directory."""
        output_paths: list[Path] = []
        for path in image_paths:
            path_obj = Path(path)
            output_name = f"{path_obj.stem}{suffix}{path_obj.suffix}"
            output_path = Path(output_dir) / output_name
            self.selective_blur_image(path_obj, output_path, tolerance=tolerance, blur_kernel=blur_kernel)
            output_paths.append(output_path)
        return output_paths

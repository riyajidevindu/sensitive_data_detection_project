"""Command-line demo for selective face blurring using OpenCV-based face similarity."""
from __future__ import annotations

import argparse
import logging
from pathlib import Path
from typing import Iterable

from app.services.face_recognition_blur import FaceRecognitionBlur, FaceRecognitionBlurError

logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def _parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Selective face blurring demo")
    parser.add_argument("--reference", type=Path, help="Path to the reference image containing the user's face")
    parser.add_argument(
        "--images",
        type=Path,
        nargs="+",
        help="One or more images that should be processed with selective blurring",
    )
    parser.add_argument(
        "--encoding-file",
        type=Path,
        help="Optional .npy file containing a previously saved face encoding",
    )
    parser.add_argument(
        "--save-encoding",
        type=Path,
        help="Optional path to save the extracted face encoding for future runs",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("outputs/selective_blur"),
        help="Directory where processed images will be written",
    )
    parser.add_argument(
        "--tolerance",
        type=float,
    default=0.75,
    help="Similarity threshold for matching the user's face (higher is stricter)",
    )
    parser.add_argument(
        "--kernel",
        type=int,
        default=51,
        help="Gaussian blur kernel size (must be odd)",
    )
    return parser.parse_args()


def _validate_paths(reference: Path | None, images: Iterable[Path]) -> None:
    if reference and not reference.exists():
        raise SystemExit(f"Reference image '{reference}' does not exist.")

    missing = [str(path) for path in images if not path.exists()]
    if missing:
        raise SystemExit(f"The following input images do not exist: {', '.join(missing)}")


def run_demo(args: argparse.Namespace) -> None:
    _validate_paths(args.reference, args.images or [])

    processor = FaceRecognitionBlur(tolerance=args.tolerance)

    try:
        if args.encoding_file and args.encoding_file.exists():
            processor.load_reference_encoding(args.encoding_file)
        elif args.reference:
            processor.load_reference_image(args.reference)
        else:
            raise SystemExit("Either provide a reference image via --reference or an encoding via --encoding-file.")

        if args.save_encoding:
            processor.save_reference_encoding(args.save_encoding)

        if not args.images:
            logger.warning("No input images supplied. Nothing to process.")
            return

        logger.info("Processing %d image(s) with tolerance=%.2f", len(args.images), args.tolerance)
        output_paths = processor.process_images(
            args.images,
            args.output_dir,
            tolerance=args.tolerance,
            blur_kernel=args.kernel,
        )

        for output_path in output_paths:
            logger.info("Saved processed image to %s", output_path)

    except FaceRecognitionBlurError as exc:
        logger.error("%s", exc)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Unexpected error: %s", exc)


if __name__ == "__main__":
    run_demo(_parse_arguments())

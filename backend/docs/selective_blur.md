# Selective Face Blurring with OpenCV

This guide describes how to enable **face-similarity-based selective blurring** in the backend using only
`OpenCV` and `numpy`—no external face recognition binaries required.

## 🧱 Features

- Upload and encode a reference face image.
- Persist and reload reference encodings (`.npy` files).
- Blur all detected faces in an image **except** the one matching the reference encoding.
- Batch-processing helper for multiple images.
- Command-line demo script to exercise the workflow end-to-end.

## 📦 Installation

The feature relies on the following Python packages:

- [`opencv-python`](https://pypi.org/project/opencv-python/)
- [`numpy`](https://pypi.org/project/numpy/)

Install the requirements (from the project root):

```powershell
cd e:\Campus\Semester_07\Vision\sensitive_data_detection_project_v2\backend
python -m pip install --upgrade pip
pip install -r requirements.txt
```

The backend now leverages OpenCV's Haar cascade detector and a lightweight embedding computed directly from face
patches, which makes installation much simpler—no extra compilers or GPU dependencies are required.

## 🧠 Core API

`app/services/face_recognition_blur.py` exposes the `FaceRecognitionBlur` class:

```python
from app.services.face_recognition_blur import FaceRecognitionBlur

processor = FaceRecognitionBlur(tolerance=0.75)
processor.load_reference_image("./reference/user.jpg")
processor.save_reference_encoding("./reference/user_encoding.npy")

processed = processor.selective_blur_image(
    "./inputs/group_photo.jpg",
    output_path="./outputs/group_photo_selective.jpg",
    blur_kernel=51,
)
```

Key methods:

- `load_reference_image(path)` – extracts and stores the reference face embedding from a photo.
- `load_reference_encoding(path)` / `save_reference_encoding(path)` – persist embeddings across sessions (`.npy` files).
- `selective_blur_image(image_path, output_path=None, tolerance=None, blur_kernel=51)` – blur all faces except the stored reference face.
- `process_images(image_paths, output_dir, ...)` – convenience batch processor for multiple images.

All methods raise `FaceRecognitionBlurError` with descriptive messages when something goes wrong (e.g., no face detected).

## 🚀 Demo Workflow

A ready-to-use script lives in `backend/scripts/selective_blur_demo.py`.

Example usage:

```powershell
cd e:\Campus\Semester_07\Vision\sensitive_data_detection_project_v2\backend
python -m scripts.selective_blur_demo `
  --reference .\reference\me.jpg `
  --images .\samples\photo1.jpg .\samples\photo2.jpg `
  --save-encoding .\reference\me_encoding.npy `
  --output-dir .\outputs\selective `
  --tolerance 0.75 `
  --kernel 51
```

Subsequent runs can reuse the saved encoding without providing a reference image:

```powershell
python -m scripts.selective_blur_demo `
  --encoding-file .\reference\me_encoding.npy `
  --images .\samples\photo3.jpg
```

## ⚙️ Optional Tweaks

- **Tolerance:** Higher values (closer to `1.0`) demand stronger similarity and make matching stricter. Lower values allow more variance.
- **Kernel Size:** Increase the `--kernel` argument for stronger blur, ensuring it remains an odd integer.
- **Integration:** The `FaceRecognitionBlur` class can be wired into existing FastAPI routes or background jobs to extend the current detection pipeline.

---

With these pieces in place, you can selectively protect the privacy of everyone except the target individual in uploaded images.

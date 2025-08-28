import sys
import os
from ultralytics import YOLO

MODEL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'model'))
PT_PATH = os.path.join(MODEL_DIR, 'best.pt')
ONNX_PATH = os.path.join(MODEL_DIR, 'best.onnx')

if __name__ == '__main__':
    model_path = PT_PATH if len(sys.argv) < 2 else sys.argv[1]
    out_path = ONNX_PATH if len(sys.argv) < 3 else sys.argv[2]

    print(f"Loading model: {model_path}")
    model = YOLO(model_path)

    print(f"Exporting to ONNX: {out_path}")
    model.export(format='onnx', imgsz=640, opset=12, dynamic=False, simplify=False, optimize=False, half=False)

    # Ultralytics saves to model_path.with_suffix('.onnx') next to the .pt by default
    # Move/rename if needed
    default_out = os.path.splitext(model_path)[0] + '.onnx'
    if os.path.exists(default_out) and default_out != out_path:
        os.replace(default_out, out_path)
    print(f"Saved ONNX model to: {out_path}")

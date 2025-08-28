import pytest
import sys
import os

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'app'))

def test_imports():
    """Test that all modules can be imported"""
    try:
        from app.core.config import settings
        from app.services.detector import YOLOv8Detector
        from app.services.image_processor import ImageProcessor
        from app.utils.file_handler import FileHandler
        assert True
    except ImportError as e:
        pytest.fail(f"Import failed: {e}")

def test_settings():
    """Test that settings are loaded correctly"""
    from app.core.config import settings
    
    assert settings.PROJECT_NAME == "Sensitive Data Detection API"
    assert settings.VERSION == "1.0.0"
    assert settings.CONFIDENCE_THRESHOLD >= 0.0
    assert settings.CONFIDENCE_THRESHOLD <= 1.0

def test_file_validation():
    """Test file validation logic"""
    from app.utils.file_handler import FileHandler
    
    handler = FileHandler()
    
    # Test valid files
    assert handler.validate_file("test.jpg", 1000000) == True
    assert handler.validate_file("test.png", 1000000) == True
    
    # Test invalid files
    assert handler.validate_file("test.txt", 1000000) == False
    assert handler.validate_file("test.jpg", 999999999) == False

if __name__ == "__main__":
    pytest.main([__file__])

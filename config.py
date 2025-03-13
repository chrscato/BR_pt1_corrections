"""
Centralized configuration for the Medical Records Processing application.
"""
from pathlib import Path
import os

# Application settings
HOST = '0.0.0.0'
PORT = 5002
DEBUG = False
AUTO_OPEN_BROWSER = True

# File paths - Update these paths as needed for your environment
BASE_PATH = Path(r"C:\Users\ChristopherCato\OneDrive - clarity-dx.com\Documents\Bill_Review_INTERNAL")

# Database path
DB_PATH = BASE_PATH / r"reference_tables\orders2.db"

# Validation logs path
VALIDATION_LOGS_PATH = BASE_PATH / "validation logs"

# Folder paths with meaningful names
FOLDERS = {
    # Unmapped Review App folders
    'UNMAPPED_FOLDER': BASE_PATH / r"scripts\VAILIDATION\data\extracts\valid\unmapped",
    'MAPPED_FOLDER': BASE_PATH / r"scripts\VAILIDATION\data\extracts\valid\mapped",
    
    # OCR Corrections App folders
    'FAILS_FOLDER': BASE_PATH / r"scripts\VAILIDATION\data\extracts\review",
    'OUTPUT_FOLDER': BASE_PATH / r"scripts\VAILIDATION\data\extracts\corrections",
    'ORIGINALS_FOLDER': BASE_PATH / r"scripts\VAILIDATION\data\extracts\review\archive",
    
    # Shared folders
    'PDF_FOLDER': BASE_PATH / r"pdf\dual_ocr\pdfs\archive",
    
    # Rate Corrections folders
    'RATE_FAILURES_FOLDER': BASE_PATH / "validation logs",
    'RATE_RESOLUTIONS_FOLDER': BASE_PATH / r"scripts\VAILIDATION\data\extracts\resolved_rates",
}

# Fuzzy matching settings
FUZZY_MATCH_THRESHOLD = 75  # Minimum score for fuzzy matches (0-100)
DEFAULT_MONTHS_RANGE = 3    # Default month range for DOS searches
MAX_SEARCH_RESULTS = 50     # Maximum search results to display

# PDF region settings (as ratios of page dimensions)
PDF_REGIONS = {
    'header': (0, 0, 1, 0.25),       # (left, top, right, bottom)
    'service_lines': (0, 0.35, 1, 0.8),  # Changed from 0.25 to 0.35 to match example
    'footer': (0, 0.8, 1, 1)
}

# Feature flags
FEATURES = {
    'DARK_MODE': True,
    'CPT_VALIDATION': True,
    'AUTO_SEARCH': True
}

# Base directory of the application
BASE_DIR = Path(__file__).resolve().parent

# Ensure required directories exist
for folder in FOLDERS.values():
    folder.mkdir(exist_ok=True)

# Database configuration
DATABASE_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'database': os.getenv('DB_NAME', 'provider_db'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'postgres'),
    'port': int(os.getenv('DB_PORT', '5432'))
}
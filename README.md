# Medical Records Processing Application

A comprehensive web-based solution for managing, mapping, and correcting medical billing records. This application combines multiple tools into a unified platform to streamline the medical record review process.

![Application Screenshot](https://via.placeholder.com/1200x600?text=Medical+Records+Processing+Application)

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
- [Usage Guide](#usage-guide)
  - [Home Dashboard](#home-dashboard)
  - [Unmapped Records Review](#unmapped-records-review)
  - [OCR Corrections](#ocr-corrections)
- [Technical Details](#technical-details)
  - [Architecture](#architecture)
  - [Directory Structure](#directory-structure)
  - [Database Schema](#database-schema)
- [Customization](#customization)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

## Overview

The Medical Records Processing Application is designed to assist healthcare billing specialists in processing and correcting medical records that require manual intervention. It combines two powerful tools in a single, cohesive interface:

1. **Unmapped Records Review** - For matching patient records that couldn't be automatically mapped to database entries
2. **OCR Corrections** - For reviewing and fixing information extracted from medical bills using OCR technology

This unified approach streamlines workflow, reduces context switching, and provides a consistent user experience across both tools.

## Key Features

### General Features

- **Unified Dashboard** - Central hub displaying pending work and quick access to all tools
- **Dark Mode Support** - Reduces eye strain during extended work sessions
- **PDF Visualization** - Integrated PDF viewer with region-specific views
- **Responsive Design** - Works on various screen sizes and devices
- **Modern Interface** - Clean, intuitive design focused on productivity

### Unmapped Records Review

- **Smart Search** - Fuzzy matching algorithm finds similar records despite text variations
- **Proximity Sorting** - Results sorted by date proximity and match quality
- **Inline Editing** - Edit patient data and service lines directly in the interface
- **Change Tracking** - Keeps track of all modifications to records

### OCR Corrections

- **Side-by-Side Verification** - Compare extracted data with original PDF regions
- **Batch Processing** - Navigate easily between multiple records
- **Data Validation** - Automatic validation of data formats and CPT codes
- **Custom Fields** - Edit all aspects of OCR-extracted information

## Getting Started

### Prerequisites

- Python 3.7 or higher
- Modern web browser (Chrome, Firefox, Edge recommended)
- Access to medical records database
- PDF files corresponding to medical records

### Installation

1. **Clone or download the application:**

   ```bash
   git clone https://github.com/your-organization/medical-records-app.git
   cd medical-records-app
   ```

2. **Set up a virtual environment (recommended):**

   ```bash
   python -m venv venv
   
   # On Windows
   venv\Scripts\activate
   
   # On macOS/Linux
   source venv/bin/activate
   ```

3. **Install required packages:**

   ```bash
   pip install -r requirements.txt
   ```

4. **Update configuration file:**
   
   Edit `config.py` with your specific directory paths and settings (see [Configuration](#configuration) section).

5. **Run the application:**

   ```bash
   python app.py
   ```

6. **Access the application:**
   
   Open your browser and navigate to `http://localhost:5000`

### Configuration

All application settings are centralized in the `config.py` file. Important settings include:

#### File Paths

```python
# Base path to your medical records
BASE_PATH = Path(r"C:\path\to\your\medical_records")

# Folder paths
FOLDERS = {
    # Unmapped Review App folders
    'UNMAPPED_FOLDER': BASE_PATH / r"data\extracts\valid\unmapped",
    'MAPPED_FOLDER': BASE_PATH / r"data\extracts\valid\mapped",
    
    # OCR Corrections App folders
    'FAILS_FOLDER': BASE_PATH / r"data\extracts\review",
    'OUTPUT_FOLDER': BASE_PATH / r"data\extracts\corrections",
    'ORIGINALS_FOLDER': BASE_PATH / r"data\extracts\review\archive",
    
    # Shared folders
    'PDF_FOLDER': BASE_PATH / r"pdf\dual_ocr\pdfs\archive",
}
```

#### Database Settings

```python
# Path to your SQLite database
DB_PATH = BASE_PATH / r"reference_tables\orders2.db"
```

#### Application Settings

```python
# Web server settings
HOST = '0.0.0.0'  # Listen on all interfaces
PORT = 5000       # Port to run the app on
DEBUG = False     # Set to True for development

# Feature flags
FEATURES = {
    'DARK_MODE': True,
    'CPT_VALIDATION': True,
    'AUTO_SEARCH': True
}
```

## Usage Guide

### Home Dashboard

The home dashboard provides an overview of pending work and quick access to all tools.

![Home Dashboard](https://via.placeholder.com/800x400?text=Home+Dashboard)

**Key Elements:**
- Tool cards with pending work counts
- Quick access buttons to launch specific tools
- Statistics overview

### Unmapped Records Review

This tool helps match patient records to database entries when automated matching fails.

![Unmapped Records Review](https://via.placeholder.com/800x400?text=Unmapped+Records+Review)

**Step-by-Step Workflow:**

1. **Select a file** from the list on the left panel
2. **Review patient information** in the middle panel
3. **Examine the PDF** in the viewer below
   - Toggle between full PDF and specific regions
4. **Search for matches** using the form on the right
   - Results are automatically sorted by relevance
   - Click on a match to apply it
5. **Edit information if needed** by clicking "Edit" buttons
6. **Save changes** when finished

**Pro Tips:**
- Use the PDF region views to focus on specific parts of the document
- If no good matches are found, try broadening your search criteria
- Edit any incorrect data before saving
- The save button shows the number of changes you've made

### OCR Corrections

This tool helps review and correct data extracted from medical bills using OCR technology.

![OCR Corrections](https://via.placeholder.com/800x400?text=OCR+Corrections)

**Step-by-Step Workflow:**

1. **Navigate** through files using the Previous/Next buttons
2. **View PDF regions** by clicking the "View Region" badges
3. **Compare** the displayed data with the original PDF
4. **Correct any errors** in the form fields
5. **Add or remove service lines** as needed
6. **Save changes** when finished

**Pro Tips:**
- Use the "Open Full PDF" button to see the entire document
- Add line items when OCR missed extracting them
- Check total charge amounts for accuracy

## Technical Details

### Architecture

The application uses a Flask-based backend with a modular architecture:

- **Flask Blueprints** - Each tool is implemented as a separate blueprint
- **MVC Pattern** - Clear separation between data, presentation, and logic
- **Shared Utilities** - Common code for PDF processing, text normalization, etc.
- **REST API** - JSON-based API for client-server communication

### Directory Structure

```
medical_records_app/
├── app.py                  # Main Flask application
├── config.py               # Configuration settings
├── db_utils.py             # Database utilities
├── pdf_utils.py            # PDF handling functions
├── text_utils.py           # Text processing utilities
├── routes/
│   ├── __init__.py         # Routes package initialization
│   ├── unmapped.py         # Unmapped review routes
│   └── corrections.py      # OCR corrections routes
├── static/
│   ├── css/
│   │   ├── styles.css      # Common styles
│   │   ├── dark-mode.css   # Dark mode theme
│   │   ├── unmapped.css    # Unmapped app specific styles
│   │   └── corrections.css # Corrections app specific styles
│   ├── js/
│   │   ├── common.js       # Shared functions
│   │   ├── unmapped/       # Unmapped app scripts
│   │   └── corrections/    # Corrections app scripts
└── templates/
    ├── base.html           # Base template with common elements
    ├── home.html           # Homepage/landing page
    ├── unmapped/           # Unmapped app templates
    └── corrections/        # Corrections app templates
```

### Database Schema

The application interacts with a SQLite database with the following key tables:

#### orders Table
- `Order_ID` - Primary key
- `FileMaker_Record_Number` - FileMaker database reference
- `Patient_Last_Name` - Patient's last name
- `Patient_First_Name` - Patient's first name
- `PatientName` - Full patient name

#### line_items Table
- `Order_ID` - Foreign key to orders
- `DOS` - Date of service
- `CPT` - CPT code
- `Description` - Procedure description

#### cpt_codes Table (for validation)
- `CPT` - CPT code
- `Description` - Procedure description
- `DefaultFee` - Standard fee for the procedure

## Customization

### Adding New Tools

The modular architecture makes it easy to add new tools:

1. Create a new blueprint in the `routes/` directory
2. Add templates in a new subfolder under `templates/`
3. Add JavaScript in a new subfolder under `static/js/`
4. Register the blueprint in `app.py`

### Styling

To customize the appearance:

1. Modify `styles.css` for global changes
2. Modify `dark-mode.css` for dark theme changes
3. Add tool-specific styles in separate CSS files

## Troubleshooting

### Common Issues

#### PDF Viewer Not Loading
- Ensure PDF files exist in the configured PDF folder
- Check file permissions
- Verify PDF filenames match JSON filenames

#### No Database Results
- Check database connection and path
- Verify the database schema matches expected structure
- Try broader search terms

#### Saving Fails
- Check folder permissions
- Ensure target folders exist
- Verify JSON data structure is valid

### Logging

The application logs errors and events to help with troubleshooting:

- Check console output for Python errors
- Check browser console for JavaScript errors
- Enable DEBUG mode in `config.py` for more detailed logs

## FAQ

**Q: Can I use this application with a different database?**  
A: Yes, modify the `db_utils.py` file to connect to your specific database system.

**Q: How do I add users and authentication?**  
A: The base application doesn't include authentication. Integrate Flask-Login or a similar package.

**Q: Can I process multiple records simultaneously?**  
A: The current design processes one record at a time for accuracy, but you can open multiple browser tabs.

**Q: Is the application compatible with all PDF formats?**  
A: The application uses PyMuPDF which supports most PDF formats. Very old or unusual formats might have issues.

**Q: How can I customize the PDF region extraction?**  
A: Modify the region coordinates in `config.py` to match your document layout.

---

© 2025 Your Organization | [License](LICENSE.md) | [Contact Support](mailto:support@example.com)
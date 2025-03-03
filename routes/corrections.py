"""
Routes for the OCR Corrections functionality.
"""
from flask import Blueprint, jsonify, request, render_template, send_file
import json
import config
from pathlib import Path
import logging
import fitz
import base64

# Import utilities
from pdf_utils import get_pdf_path, extract_pdf_region
from text_utils import validate_filename

# Create Blueprint
corrections_bp = Blueprint('corrections', __name__)

@corrections_bp.route('/')
def index():
    """Render the OCR corrections interface."""
    return render_template('corrections/index.html')

@corrections_bp.route('/api/files', methods=['GET'])
def list_files():
    """List all files that need OCR correction."""
    files = [f.name for f in config.FOLDERS['FAILS_FOLDER'].glob('*.json')]
    return jsonify({'files': files})

@corrections_bp.route('/api/file/<filename>', methods=['GET'])
def get_file(filename):
    """Get the content of a specific JSON file."""
    try:
        safe_filename = validate_filename(filename)
        file_path = config.FOLDERS['FAILS_FOLDER'] / safe_filename
        with open(file_path, 'r') as f:
            data = json.load(f)
            # Ensure numeric types for units
            if 'service_lines' in data:
                for line in data['service_lines']:
                    if 'units' in line:
                        line['units'] = int(line['units']) if str(line['units']).isdigit() else 1
            return jsonify({'data': data})
    except Exception as e:
        print(f"Error loading file {filename}: {e}")
        return jsonify({'error': str(e)}), 500

@corrections_bp.route('/api/pdf/<filename>', methods=['GET'])
def get_pdf(filename):
    """Serve a PDF file for viewing."""
    safe_filename = validate_filename(filename)
    pdf_filename = Path(safe_filename).with_suffix('.pdf')
    pdf_path = config.FOLDERS['PDF_FOLDER'] / pdf_filename
    return send_file(pdf_path, mimetype='application/pdf') if pdf_path.exists() else (jsonify({'error': 'PDF not found'}), 404)

@corrections_bp.route('/api/pdf_region/<filename>/<region>', methods=['GET'])
def get_pdf_region(filename, region):
    """Get a specific region of a PDF as an image."""
    logger = logging.getLogger(__name__)
    
    logger.info(f"PDF region request received for file: {filename}, region: {region}")
    try:
        # Directly use our extract_pdf_region utility function which should now match the example
        image_data = extract_pdf_region(filename, region)
        return jsonify({'image': image_data})
    except Exception as e:
        logger.error(f"Error in get_pdf_region: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500
    

@corrections_bp.route('/api/save', methods=['POST'])
def save_file():
    """Save changes to a file and move it to the output folder."""
    try:
        data = request.json
        filename = validate_filename(data['filename'])
        content = data['content']
        original_content = data['original_content']
        
        # Save processed file
        with open(config.FOLDERS['OUTPUT_FOLDER'] / filename, 'w') as f:
            json.dump(content, f, indent=2)
            
        # Archive original
        with open(config.FOLDERS['ORIGINALS_FOLDER'] / filename, 'w') as f:
            json.dump(original_content, f, indent=2)
            
        # Remove from fails folder
        (config.FOLDERS['FAILS_FOLDER'] / filename).unlink(missing_ok=True)
        
        return jsonify({'message': 'File saved successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
from flask import Flask, jsonify, request, render_template, send_file
from flask_cors import CORS
import json
import os
import fitz  # PyMuPDF
import base64
from pathlib import Path
from io import BytesIO
import webbrowser
import threading
import time

# Ensure the static and templates directories exist
static_dir = Path(__file__).parent / 'static'
templates_dir = Path(__file__).parent / 'templates'
static_dir.mkdir(parents=True, exist_ok=True)
templates_dir.mkdir(parents=True, exist_ok=True)

app = Flask(__name__, static_folder=static_dir, template_folder=templates_dir)
CORS(app)

# Configuration - Update these paths as needed
FAILS_FOLDER = Path(r"C:\Users\ChristopherCato\OneDrive - clarity-dx.com\Documents\Bill_Review_INTERNAL\scripts\VAILIDATION\data\extracts\review")
OUTPUT_FOLDER = Path(r"C:\Users\ChristopherCato\OneDrive - clarity-dx.com\Documents\Bill_Review_INTERNAL\scripts\VAILIDATION\data\extracts\corrections")
PDF_FOLDER = Path(r"C:\Users\ChristopherCato\OneDrive - clarity-dx.com\Documents\Bill_Review_INTERNAL\pdf\dual_ocr\pdfs\archive")
ORIGINALS_FOLDER = Path(r"C:\Users\ChristopherCato\OneDrive - clarity-dx.com\Documents\Bill_Review_INTERNAL\scripts\VAILIDATION\data\extracts\review\archive")

# Create folders if needed
for folder in [FAILS_FOLDER, OUTPUT_FOLDER, PDF_FOLDER, ORIGINALS_FOLDER]:
    folder.mkdir(parents=True, exist_ok=True)

def validate_filename(filename):
    """Sanitize filename to prevent path traversal"""
    return Path(filename).name

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/files', methods=['GET'])
def list_files():
    files = [f.name for f in FAILS_FOLDER.glob('*.json')]
    return jsonify({'files': files})

@app.route('/api/file/<filename>', methods=['GET'])
def get_file(filename):
    try:
        safe_filename = validate_filename(filename)
        file_path = FAILS_FOLDER / safe_filename
        with open(file_path, 'r') as f:
            data = json.load(f)
            # Ensure numeric types for units
            if 'service_lines' in data:
                for line in data['service_lines']:
                    if 'units' in line:
                        line['units'] = int(line['units']) if str(line['units']).isdigit() else 1
            return jsonify({'data': data})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
    
@app.route('/api/pdf/<filename>', methods=['GET'])
def get_pdf(filename):
    safe_filename = validate_filename(filename)
    pdf_filename = Path(safe_filename).with_suffix('.pdf')
    pdf_path = PDF_FOLDER / pdf_filename
    return send_file(pdf_path, mimetype='application/pdf') if pdf_path.exists() else (jsonify({'error': 'PDF not found'}), 404)

@app.route('/api/pdf_region/<filename>/<region>', methods=['GET'])
def get_pdf_region(filename, region):
    try:
        safe_filename = Path(filename).stem + '.pdf'
        pdf_path = PDF_FOLDER / safe_filename
        doc = fitz.open(pdf_path)
        page = doc[0]
        page_rect = page.rect

        regions = {
            'header': fitz.Rect(0, 0, page_rect.width, page_rect.height * 0.25),
            'service_lines': fitz.Rect(0, page_rect.height * 0.35, page_rect.width, page_rect.height * 0.8),
            'footer': fitz.Rect(0, page_rect.height * 0.8, page_rect.width, page_rect.height)
        }

        if region not in regions:
            return jsonify({'error': 'Invalid region'}), 400

        pix = page.get_pixmap(clip=regions[region])
        img_base64 = base64.b64encode(pix.tobytes("png")).decode()

        return jsonify({'image': f'data:image/png;base64,{img_base64}'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/save', methods=['POST'])
def save_file():
    try:
        data = request.json
        filename = validate_filename(data['filename'])
        content = data['content']
        original_content = data['original_content']
        
        # Save processed file
        with open(OUTPUT_FOLDER / filename, 'w') as f:
            json.dump(content, f, indent=2)
            
        # Archive original
        with open(ORIGINALS_FOLDER / filename, 'w') as f:
            json.dump(original_content, f, indent=2)
            
        # Remove from fails folder
        (FAILS_FOLDER / filename).unlink(missing_ok=True)
        
        return jsonify({'message': 'File saved successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def open_browser():
    time.sleep(2)
    webbrowser.open('http://127.0.0.1:5000')

if __name__ == "__main__":
    threading.Thread(target=open_browser).start()
    app.run(host='0.0.0.0', port=5000, debug=False)
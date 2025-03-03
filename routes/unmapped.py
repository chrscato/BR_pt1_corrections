"""
Routes for the Unmapped Records Review functionality.
"""
from flask import Blueprint, jsonify, request, render_template, send_file
import json
import config
from pathlib import Path
import shutil
import datetime

# Import utilities
from pdf_utils import get_pdf_path, extract_pdf_region
from text_utils import validate_filename, split_patient_name
from db_utils import search_by_name_and_dos, validate_cpt

# Create Blueprint
unmapped_bp = Blueprint('unmapped', __name__)

@unmapped_bp.route('/')
def index():
    """Render the unmapped records review interface."""
    return render_template('unmapped/index.html')

@unmapped_bp.route('/api/files', methods=['GET'])
def list_files():
    """List all unmapped JSON files."""
    files = [f.name for f in config.FOLDERS['UNMAPPED_FOLDER'].glob('*.json')]
    return jsonify({'files': files})

@unmapped_bp.route('/api/file/<filename>', methods=['GET'])
def get_file(filename):
    """Get the content of a specific JSON file."""
    try:
        safe_filename = validate_filename(filename)
        file_path = config.FOLDERS['UNMAPPED_FOLDER'] / safe_filename
        with open(file_path, 'r') as f:
            data = json.load(f)
            return jsonify({'data': data})
    except Exception as e:
        print(f"Error loading file {filename}: {e}")
        return jsonify({'error': str(e)}), 500

@unmapped_bp.route('/api/pdf/<filename>', methods=['GET'])
def get_pdf(filename):
    """Serve a PDF file for viewing."""
    pdf_path = get_pdf_path(filename)
    return send_file(pdf_path, mimetype='application/pdf') if pdf_path.exists() else (jsonify({'error': 'PDF not found'}), 404)

@unmapped_bp.route('/api/pdf_region/<filename>/<region>', methods=['GET'])
def get_pdf_region(filename, region):
    """Get a specific region of a PDF as an image."""
    try:
        image_data = extract_pdf_region(filename, region)
        return jsonify({'image': image_data})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@unmapped_bp.route('/api/search', methods=['POST'])
def search():
    """Search the database for matching records."""
    try:
        data = request.json
        first_name = data.get('first_name', '')
        last_name = data.get('last_name', '')
        dos_date = data.get('dos_date', '')
        months_range = int(data.get('months_range', config.DEFAULT_MONTHS_RANGE))
        
        # Validate inputs
        if not last_name and not first_name:
            return jsonify({'error': 'Please provide at least a first or last name'}), 400
            
        # Perform the search with enhanced fuzzy matching
        results = search_by_name_and_dos(first_name, last_name, dos_date, months_range)
            
        return jsonify({'results': results})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@unmapped_bp.route('/api/extract_patient_info/<filename>', methods=['GET'])
def extract_patient_info(filename):
    """Extract patient name and DOS from a file to pre-populate search."""
    try:
        safe_filename = validate_filename(filename)
        file_path = config.FOLDERS['UNMAPPED_FOLDER'] / safe_filename
        
        with open(file_path, 'r') as f:
            json_data = json.load(f)
            
        # Extract patient name
        patient_name = json_data.get("patient_info", {}).get("patient_name", "")
        first_name, last_name = split_patient_name(patient_name)
        
        # Extract DOS from first service line
        first_dos = ""
        service_lines = json_data.get("service_lines", [])
        if service_lines and len(service_lines) > 0:
            first_dos = service_lines[0].get("date_of_service", "")
            
        return jsonify({
            'first_name': first_name or "",
            'last_name': last_name or "",
            'dos': first_dos
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@unmapped_bp.route('/api/validate_cpt', methods=['POST'])
def validate_cpt_route():
    """Validate a CPT code against the database."""
    try:
        data = request.json
        cpt_code = data.get('cpt_code', '')
        result = validate_cpt(cpt_code)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@unmapped_bp.route('/api/save', methods=['POST'])
def save_file():
    """Save changes to a file and move it to the mapped folder."""
    try:
        data = request.json
        filename = validate_filename(data['filename'])
        content = data['content']
        
        # Optional: Log the changes if needed
        changes_made = data.get('changes_made', [])
        if changes_made:
            print(f"Changes made to {filename}:")
            for change in changes_made:
                print(f"- {change}")
        
        # Save to the mapped folder
        with open(config.FOLDERS['MAPPED_FOLDER'] / filename, 'w') as f:
            json.dump(content, f, indent=2)
            
        # Remove from unmapped folder
        (config.FOLDERS['UNMAPPED_FOLDER'] / filename).unlink(missing_ok=True)
        
        return jsonify({'message': 'File saved successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@unmapped_bp.route('/api/not_found', methods=['POST'])
def not_found():
    """
    Handle the NOT FOUND IN FILEMAKER action.
    Moves the file to the review2 folder without requiring any additional information.
    """
    try:
        data = request.json
        filename = validate_filename(data.get('filename', ''))
        
        if not filename:
            return jsonify({'error': 'Filename is required'}), 400
            
        # Source file path
        source_path = config.FOLDERS['UNMAPPED_FOLDER'] / filename
        
        # Ensure the review2 folder exists
        review2_folder = config.BASE_PATH / r"scripts\VAILIDATION\data\extracts\review2"
        review2_folder.mkdir(parents=True, exist_ok=True)
        
        # Target file path
        target_path = review2_folder / filename
        
        # Move the file to the review2 folder
        if source_path.exists():
            # Read the original file content
            with open(source_path, 'r') as f:
                content = json.load(f)
                
            # Write to the target location
            with open(target_path, 'w') as f:
                json.dump(content, f, indent=2)
                
            # Remove from unmapped folder
            source_path.unlink()
            
            return jsonify({'message': 'File marked as not found and moved to review2 folder'})
        else:
            return jsonify({'error': f'Source file not found: {filename}'}), 404
            
    except Exception as e:
        import traceback
        print(f"Error in not_found: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@unmapped_bp.route('/api/escalate', methods=['POST'])
def escalate():
    """
    Handle the ESCALATE action.
    Adds a note to the file and moves it to the escalations folder.
    """
    try:
        data = request.json
        filename = validate_filename(data.get('filename', ''))
        content = data.get('content', {})
        notes = data.get('notes', '')
        
        if not filename:
            return jsonify({'error': 'Filename is required'}), 400
            
        if not notes:
            return jsonify({'error': 'Escalation notes are required'}), 400
            
        # Source file path
        source_path = config.FOLDERS['UNMAPPED_FOLDER'] / filename
        
        # Ensure the escalations folder exists
        escalations_folder = config.BASE_PATH / r"scripts\VAILIDATION\data\extracts\escalations"
        escalations_folder.mkdir(parents=True, exist_ok=True)
        
        # Target file path
        target_path = escalations_folder / filename
        
        # Move the file to the escalations folder
        if source_path.exists():
            # Add escalation metadata if not already present
            if not content.get('escalation'):
                content['escalation'] = {}
                
            # Add notes and timestamp
            content['escalation']['notes'] = notes
            content['escalation']['timestamp'] = datetime.datetime.now().isoformat()
            content['escalation']['user'] = request.environ.get('REMOTE_USER', 'unknown')
            
            # Write to the target location with escalation data
            with open(target_path, 'w') as f:
                json.dump(content, f, indent=2)
                
            # Remove from unmapped folder
            source_path.unlink()
            
            return jsonify({'message': 'File escalated successfully'})
        else:
            return jsonify({'error': f'Source file not found: {filename}'}), 404
            
    except Exception as e:
        import traceback
        print(f"Error in escalate: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500
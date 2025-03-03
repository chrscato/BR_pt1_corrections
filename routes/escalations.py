"""
Routes for the Escalations Dashboard functionality.
"""
from flask import Blueprint, jsonify, request, render_template, send_file
import json
import config
from pathlib import Path
import datetime

# Import utilities
from pdf_utils import get_pdf_path, extract_pdf_region
from text_utils import validate_filename, split_patient_name
from db_utils import search_by_name_and_dos, validate_cpt

# Create Blueprint
escalations_bp = Blueprint('escalations', __name__)

@escalations_bp.route('/')
def index():
    """Render the escalations dashboard interface."""
    return render_template('escalations/index.html')

@escalations_bp.route('/api/files', methods=['GET'])
def list_files():
    """List all escalated JSON files."""
    # Ensure the escalations folder exists
    escalations_folder = config.BASE_PATH / r"scripts\VAILIDATION\data\extracts\escalations"
    escalations_folder.mkdir(parents=True, exist_ok=True)
    
    files = [f.name for f in escalations_folder.glob('*.json')]
    return jsonify({'files': files})

@escalations_bp.route('/api/file/<filename>', methods=['GET'])
def get_file(filename):
    """Get the content of a specific escalated JSON file."""
    try:
        safe_filename = validate_filename(filename)
        escalations_folder = config.BASE_PATH / r"scripts\VAILIDATION\data\extracts\escalations"
        file_path = escalations_folder / safe_filename
        
        with open(file_path, 'r') as f:
            data = json.load(f)
            return jsonify({'data': data})
    except Exception as e:
        print(f"Error loading file {filename}: {e}")
        return jsonify({'error': str(e)}), 500

@escalations_bp.route('/api/pdf/<filename>', methods=['GET'])
def get_pdf(filename):
    """Serve a PDF file for viewing."""
    pdf_path = get_pdf_path(filename)
    return send_file(pdf_path, mimetype='application/pdf') if pdf_path.exists() else (jsonify({'error': 'PDF not found'}), 404)

@escalations_bp.route('/api/pdf_region/<filename>/<region>', methods=['GET'])
def get_pdf_region(filename, region):
    """Get a specific region of a PDF as an image."""
    try:
        image_data = extract_pdf_region(filename, region)
        return jsonify({'image': image_data})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@escalations_bp.route('/api/search', methods=['POST'])
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

@escalations_bp.route('/api/resolve', methods=['POST'])
def resolve_escalation():
    """
    Resolve an escalated record by providing an Order ID and FileMaker record number.
    Moves the file to the mapped folder.
    """
    try:
        data = request.json
        filename = validate_filename(data.get('filename', ''))
        content = data.get('content', {})
        order_id = data.get('order_id', '')
        filemaker_number = data.get('filemaker_number', '')
        resolution_notes = data.get('resolution_notes', '')
        
        if not filename:
            return jsonify({'error': 'Filename is required'}), 400
            
        if not order_id:
            return jsonify({'error': 'Order ID is required to resolve an escalation'}), 400
            
        # Source file path
        escalations_folder = config.BASE_PATH / r"scripts\VAILIDATION\data\extracts\escalations"
        source_path = escalations_folder / filename
        
        # Target file path
        mapped_path = config.FOLDERS['MAPPED_FOLDER'] / filename
        
        # Update content with resolution info
        content['order_id'] = order_id
        content['filemaker_record_number'] = filemaker_number
        
        if not content.get('escalation'):
            content['escalation'] = {}
            
        # Add resolution info to escalation
        content['escalation']['resolved'] = True
        content['escalation']['resolution_notes'] = resolution_notes
        content['escalation']['resolved_at'] = datetime.datetime.now().isoformat()
        content['escalation']['resolved_by'] = request.environ.get('REMOTE_USER', 'unknown')
        
        # Move the file to the mapped folder
        if source_path.exists():
            # Write to the mapped folder with resolution data
            with open(mapped_path, 'w') as f:
                json.dump(content, f, indent=2)
                
            # Remove from escalations folder
            source_path.unlink()
            
            return jsonify({'message': 'Escalation resolved successfully'})
        else:
            return jsonify({'error': f'Source file not found: {filename}'}), 404
            
    except Exception as e:
        import traceback
        print(f"Error in resolve_escalation: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@escalations_bp.route('/api/reject', methods=['POST'])
def reject_escalation():
    """
    Reject an escalated record and move it to a rejected folder.
    """
    try:
        data = request.json
        filename = validate_filename(data.get('filename', ''))
        content = data.get('content', {})
        rejection_reason = data.get('rejection_reason', '')
        
        if not filename:
            return jsonify({'error': 'Filename is required'}), 400
            
        if not rejection_reason:
            return jsonify({'error': 'Rejection reason is required'}), 400
            
        # Source file path
        escalations_folder = config.BASE_PATH / r"scripts\VAILIDATION\data\extracts\escalations"
        source_path = escalations_folder / filename
        
        # Ensure the rejected folder exists
        rejected_folder = config.BASE_PATH / r"scripts\VAILIDATION\data\extracts\rejected"
        rejected_folder.mkdir(parents=True, exist_ok=True)
        
        # Target file path
        rejected_path = rejected_folder / filename
        
        # Update content with rejection info
        if not content.get('escalation'):
            content['escalation'] = {}
            
        # Add rejection info to escalation
        content['escalation']['rejected'] = True
        content['escalation']['rejection_reason'] = rejection_reason
        content['escalation']['rejected_at'] = datetime.datetime.now().isoformat()
        content['escalation']['rejected_by'] = request.environ.get('REMOTE_USER', 'unknown')
        
        # Move the file to the rejected folder
        if source_path.exists():
            # Write to the rejected folder with rejection data
            with open(rejected_path, 'w') as f:
                json.dump(content, f, indent=2)
                
            # Remove from escalations folder
            source_path.unlink()
            
            return jsonify({'message': 'Escalation rejected successfully'})
        else:
            return jsonify({'error': f'Source file not found: {filename}'}), 404
            
    except Exception as e:
        import traceback
        print(f"Error in reject_escalation: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@escalations_bp.route('/api/extract_patient_info/<filename>', methods=['GET'])
def extract_patient_info(filename):
    """Extract patient name and DOS from a file to pre-populate search."""
    try:
        safe_filename = validate_filename(filename)
        escalations_folder = config.BASE_PATH / r"scripts\VAILIDATION\data\extracts\escalations"
        file_path = escalations_folder / safe_filename
        
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
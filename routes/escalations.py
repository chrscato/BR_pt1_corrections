"""
Routes for the Escalations Dashboard functionality.
"""
from flask import Blueprint, jsonify, request, render_template, send_file
import json
import config
from pathlib import Path
import datetime
import logging
import os
import traceback

# Import utilities
from pdf_utils import get_pdf_path, extract_pdf_region
from text_utils import validate_filename, split_patient_name
from db_utils import search_by_name_and_dos, validate_cpt

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Blueprint
escalations_bp = Blueprint('escalations', __name__)

@escalations_bp.route('/')
def index():
    """Render the escalations dashboard interface."""
    return render_template('escalations/index.html')

@escalations_bp.route('/api/files', methods=['GET'])
def list_files():
    """List all escalated JSON files."""
    try:
        # Define the escalations folder path
        escalations_folder = config.BASE_PATH / r"scripts\VAILIDATION\data\extracts\escalations"
        logger.info(f"Accessing escalations folder: {escalations_folder}")
        
        # Check if the folder exists
        if not escalations_folder.exists():
            logger.warning(f"Escalations folder does not exist: {escalations_folder}")
            
            # Get parent folder status
            parent_exists = escalations_folder.parent.exists() if escalations_folder.parent else False
            logger.info(f"Parent folder exists: {parent_exists}")
            
            # Try to create the folder
            try:
                logger.info(f"Attempting to create escalations folder: {escalations_folder}")
                escalations_folder.mkdir(parents=True, exist_ok=True)
                logger.info(f"Created escalations folder: {escalations_folder}")
            except Exception as folder_err:
                logger.error(f"Failed to create escalations folder: {str(folder_err)}")
                return jsonify({
                    'error': f"Failed to create escalations folder: {str(folder_err)}",
                    'files': []
                })
        
        logger.info(f"Escalations folder exists: {escalations_folder.exists()}")
        
        # Check if the folder is accessible and readable
        if not os.access(str(escalations_folder), os.R_OK):
            logger.error(f"Escalations folder is not readable: {escalations_folder}")
            return jsonify({
                'error': "Escalations folder is not readable",
                'files': []
            })
        
        # List files in the folder
        try:
            files = [f.name for f in escalations_folder.glob('*.json')]
            logger.info(f"Found {len(files)} files in escalations folder")
            return jsonify({'files': files})
        except Exception as list_err:
            logger.error(f"Error listing files in escalations folder: {str(list_err)}")
            return jsonify({
                'error': f"Error listing files: {str(list_err)}",
                'files': []
            })
            
    except Exception as e:
        logger.error(f"Unexpected error in list_files: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            'error': f"Unexpected error: {str(e)}",
            'files': []
        })

@escalations_bp.route('/api/file/<filename>', methods=['GET'])
def get_file(filename):
    """Get the content of a specific escalated JSON file."""
    try:
        logger.info(f"Fetching escalated file: {filename}")
        safe_filename = validate_filename(filename)
        escalations_folder = config.BASE_PATH / r"scripts\VAILIDATION\data\extracts\escalations"
        file_path = escalations_folder / safe_filename
        
        if not file_path.exists():
            logger.warning(f"Escalated file not found: {file_path}")
            return jsonify({'error': f"File not found: {safe_filename}"}), 404
        
        with open(file_path, 'r') as f:
            data = json.load(f)
            logger.info(f"Successfully loaded file: {filename}")
            return jsonify({'data': data})
    except Exception as e:
        logger.error(f"Error loading file {filename}: {e}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@escalations_bp.route('/api/pdf/<filename>', methods=['GET'])
def get_pdf(filename):
    """Serve a PDF file for viewing."""
    try:
        pdf_path = get_pdf_path(filename)
        if pdf_path.exists():
            logger.info(f"Serving PDF: {pdf_path}")
            return send_file(pdf_path, mimetype='application/pdf')
        else:
            logger.warning(f"PDF not found: {pdf_path}")
            return jsonify({'error': 'PDF not found'}), 404
    except Exception as e:
        logger.error(f"Error serving PDF {filename}: {e}")
        return jsonify({'error': str(e)}), 500

@escalations_bp.route('/api/pdf_region/<filename>/<region>', methods=['GET'])
def get_pdf_region(filename, region):
    """Get a specific region of a PDF as an image."""
    try:
        logger.info(f"Extracting region {region} from PDF: {filename}")
        image_data = extract_pdf_region(filename, region)
        return jsonify({'image': image_data})
    except Exception as e:
        logger.error(f"Error extracting PDF region: {e}")
        logger.error(traceback.format_exc())
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
        
        logger.info(f"Searching for: {first_name} {last_name}, DOS: {dos_date}, Range: {months_range}")
        
        # Validate inputs
        if not last_name and not first_name:
            logger.warning("Search missing both first and last name")
            return jsonify({'error': 'Please provide at least a first or last name'}), 400
            
        # Perform the search with enhanced fuzzy matching
        results = search_by_name_and_dos(first_name, last_name, dos_date, months_range)
        logger.info(f"Search returned {len(results)} results")
            
        return jsonify({'results': results})
    except Exception as e:
        logger.error(f"Search error: {e}")
        logger.error(traceback.format_exc())
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
        
        logger.info(f"Resolving escalation for: {filename}")
        
        if not filename:
            logger.warning("Missing filename in resolve request")
            return jsonify({'error': 'Filename is required'}), 400
            
        if not order_id:
            logger.warning("Missing order ID in resolve request")
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
            try:
                # Write to the mapped folder with resolution data
                with open(mapped_path, 'w') as f:
                    json.dump(content, f, indent=2)
                logger.info(f"Wrote resolved file to: {mapped_path}")
                    
                # Remove from escalations folder
                source_path.unlink()
                logger.info(f"Removed file from escalations folder: {source_path}")
                
                return jsonify({'message': 'Escalation resolved successfully'})
            except Exception as move_err:
                logger.error(f"Error moving file: {str(move_err)}")
                return jsonify({'error': f"Error moving file: {str(move_err)}"}), 500
        else:
            logger.warning(f"Source file not found: {source_path}")
            return jsonify({'error': f'Source file not found: {filename}'}), 404
            
    except Exception as e:
        logger.error(f"Error in resolve_escalation: {str(e)}")
        logger.error(traceback.format_exc())
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
        
        logger.info(f"Rejecting escalation for: {filename}")
        
        if not filename:
            logger.warning("Missing filename in reject request")
            return jsonify({'error': 'Filename is required'}), 400
            
        if not rejection_reason:
            logger.warning("Missing rejection reason in reject request")
            return jsonify({'error': 'Rejection reason is required'}), 400
            
        # Source file path
        escalations_folder = config.BASE_PATH / r"scripts\VAILIDATION\data\extracts\escalations"
        source_path = escalations_folder / filename
        
        # Ensure the rejected folder exists
        rejected_folder = config.BASE_PATH / r"scripts\VAILIDATION\data\extracts\rejected"
        try:
            if not rejected_folder.exists():
                logger.info(f"Creating rejected folder: {rejected_folder}")
                rejected_folder.mkdir(parents=True, exist_ok=True)
        except Exception as folder_err:
            logger.error(f"Failed to create rejected folder: {str(folder_err)}")
            return jsonify({'error': f"Failed to create rejected folder: {str(folder_err)}"}), 500
        
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
            try:
                # Write to the rejected folder with rejection data
                with open(rejected_path, 'w') as f:
                    json.dump(content, f, indent=2)
                logger.info(f"Wrote rejected file to: {rejected_path}")
                    
                # Remove from escalations folder
                source_path.unlink()
                logger.info(f"Removed file from escalations folder: {source_path}")
                
                return jsonify({'message': 'Escalation rejected successfully'})
            except Exception as move_err:
                logger.error(f"Error moving file: {str(move_err)}")
                return jsonify({'error': f"Error moving file: {str(move_err)}"}), 500
        else:
            logger.warning(f"Source file not found: {source_path}")
            return jsonify({'error': f'Source file not found: {filename}'}), 404
            
    except Exception as e:
        logger.error(f"Error in reject_escalation: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@escalations_bp.route('/api/extract_patient_info/<filename>', methods=['GET'])
def extract_patient_info(filename):
    """Extract patient name and DOS from a file to pre-populate search."""
    try:
        logger.info(f"Extracting patient info from: {filename}")
        safe_filename = validate_filename(filename)
        escalations_folder = config.BASE_PATH / r"scripts\VAILIDATION\data\extracts\escalations"
        file_path = escalations_folder / safe_filename
        
        if not file_path.exists():
            logger.warning(f"File not found: {file_path}")
            return jsonify({'error': f"File not found: {safe_filename}"}), 404
        
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
            
        logger.info(f"Extracted patient info: {first_name} {last_name}, DOS: {first_dos}")
        return jsonify({
            'first_name': first_name or "",
            'last_name': last_name or "",
            'dos': first_dos
        })
    except Exception as e:
        logger.error(f"Error extracting patient info: {e}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500
"""
Routes for the Rate Corrections functionality.
"""
from flask import Blueprint, jsonify, request, render_template, send_file
import json
import sqlite3
import pandas as pd
import config
from pathlib import Path
import logging
import os
from services.ppo_updater import PPOUpdater

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Blueprint
rate_corrections_bp = Blueprint('rate_corrections', __name__)

@rate_corrections_bp.route('/')
def index():
    """Render the rate corrections interface."""
    return render_template('rate_corrections/index.html')

@rate_corrections_bp.route('/api/tins', methods=['GET'])
def list_tins():
    """List all TINs from rate validation failures that need correction."""
    try:
        # Look in the validation logs directory for the latest failures file
        log_dir = Path(config.VALIDATION_LOGS_PATH)
        
        # Find the most recent validation failures file
        failures_files = list(log_dir.glob('validation_failures_*.json'))
        if not failures_files:
            return jsonify({'error': 'No validation failure files found', 'tins': []})
            
        # Sort by modification time (most recent first)
        latest_file = sorted(failures_files, key=os.path.getmtime, reverse=True)[0]
        
        # Load the failures
        with open(latest_file, 'r') as f:
            all_failures = json.load(f)
        
        # Filter for rate failures only
        rate_failures = [f for f in all_failures if f.get('validation_type') == 'rate']
        
        # Group by TIN
        tin_groups = {}
        for failure in rate_failures:
            tin = failure.get('tin', '')
            if not tin:
                # Try to get TIN from provider_info
                provider_info = failure.get('provider_info', {})
                tin = provider_info.get('TIN', '')
            
            # Skip if still no TIN
            if not tin:
                continue
                
            # Clean TIN
            tin = ''.join(c for c in str(tin) if c.isdigit())
            if len(tin) != 9:
                continue
                
            # Group by TIN
            if tin not in tin_groups:
                tin_groups[tin] = {
                    'tin': tin,
                    'provider_name': failure.get('provider_info', {}).get('DBA Name Billing Name', 'Unknown Provider'),
                    'provider_network': failure.get('provider_info', {}).get('Provider Network', 'Unknown'),
                    'provider_status': failure.get('provider_info', {}).get('Provider Status', 'Unknown'),
                    'failures_count': 0,
                    'cpt_codes': set(),
                    'files': []
                }
            
            # Add to count and track unique CPT codes
            tin_groups[tin]['failures_count'] += 1
            
            # Add CPT codes from rates array
            rates = failure.get('rates', [])
            for rate_item in rates:
                if 'cpt' in rate_item:
                    tin_groups[tin]['cpt_codes'].add(rate_item['cpt'])
            
            # Add file info if not already added
            file_name = failure.get('file_name', '')
            if file_name and file_name not in [f['file_name'] for f in tin_groups[tin]['files']]:
                tin_groups[tin]['files'].append({
                    'file_name': file_name,
                    'order_id': failure.get('order_id', ''),
                    'patient_name': failure.get('patient_name', ''),
                    'date_of_service': failure.get('date_of_service', '')
                })
        
        # Convert to list and convert sets to lists for JSON serialization
        result = []
        for tin, data in tin_groups.items():
            data['cpt_codes'] = list(data['cpt_codes'])
            result.append(data)
            
        # Sort by failures count (highest first)
        result.sort(key=lambda x: x['failures_count'], reverse=True)
        
        return jsonify({'tins': result})
    except Exception as e:
        logger.error(f"Error listing TINs: {e}")
        return jsonify({'error': str(e), 'tins': []})

@rate_corrections_bp.route('/api/tin/<tin>/details', methods=['GET'])
def get_tin_details(tin):
    """Get detailed information about a TIN including failure details and current rates."""
    try:
        # Clean TIN
        tin = ''.join(c for c in str(tin) if c.isdigit())
        if len(tin) != 9:
            return jsonify({'error': 'Invalid TIN format'}), 400
            
        # Initialize PPO updater
        ppo_updater = PPOUpdater(config.DB_PATH)
        
        # Get current rates for this TIN
        current_rates_df = ppo_updater.get_provider_rates(tin)
        current_rates = []
        
        if not current_rates_df.empty:
            for _, row in current_rates_df.iterrows():
                current_rates.append({
                    'proc_cd': row['proc_cd'],
                    'category': row['proc_category'],
                    'rate': row['rate'],
                    'modifier': row['modifier']
                })
        
        # Find the most recent validation failures file
        log_dir = Path(config.VALIDATION_LOGS_PATH)
        failures_files = list(log_dir.glob('validation_failures_*.json'))
        if not failures_files:
            return jsonify({
                'tin': tin,
                'current_rates': current_rates,
                'failures': []
            })
            
        latest_file = sorted(failures_files, key=os.path.getmtime, reverse=True)[0]
        
        # Load the failures
        with open(latest_file, 'r') as f:
            all_failures = json.load(f)
        
        # Filter for rate failures for this TIN
        failures = []
        for failure in all_failures:
            if failure.get('validation_type') != 'rate':
                continue
                
            failure_tin = failure.get('tin', '')
            if not failure_tin:
                # Try to get TIN from provider_info
                provider_info = failure.get('provider_info', {})
                failure_tin = provider_info.get('TIN', '')
            
            # Skip if not matching TIN
            failure_tin = ''.join(c for c in str(failure_tin) if c.isdigit())
            if failure_tin != tin:
                continue
                
            # Add to failures list
            failures.append(failure)
        
        # Get all procedure categories
        categories = PPOUpdater.get_all_categories()
        category_details = {}
        
        for category in categories:
            procs = PPOUpdater.get_procedures_in_category(category)
            category_details[category] = {
                'proc_codes': procs,
                'count': len(procs)
            }
        
        return jsonify({
            'tin': tin,
            'current_rates': current_rates,
            'failures': failures,
            'categories': category_details
        })
    except Exception as e:
        logger.error(f"Error getting TIN details: {e}")
        return jsonify({'error': str(e)}), 500

@rate_corrections_bp.route('/api/categories', methods=['GET'])
def get_categories():
    """Get all procedure categories defined in the PPOUpdater."""
    try:
        categories = PPOUpdater.get_all_categories()
        category_details = {}
        
        for category in categories:
            procs = PPOUpdater.get_procedures_in_category(category)
            category_details[category] = {
                'proc_codes': procs,
                'count': len(procs)
            }
        
        return jsonify({'categories': category_details})
    except Exception as e:
        logger.error(f"Error getting categories: {e}")
        return jsonify({'error': str(e)}), 500

@rate_corrections_bp.route('/api/update_category_rates', methods=['POST'])
def update_category_rates():
    """Update rates for one or more categories for a TIN."""
    try:
        data = request.json
        tin = data.get('tin', '')
        provider_name = data.get('provider_name', 'Unknown Provider')
        state = data.get('state', 'XX')
        category_rates = data.get('category_rates', {})
        
        if not tin or not category_rates:
            return jsonify({'error': 'TIN and category rates are required'}), 400
        
        # Clean TIN
        tin = ''.join(c for c in str(tin) if c.isdigit())
        if len(tin) != 9:
            return jsonify({'error': 'Invalid TIN format'}), 400
            
        # Initialize PPO updater
        ppo_updater = PPOUpdater(config.DB_PATH)
        
        # Validate category rates
        valid_categories = PPOUpdater.get_all_categories()
        invalid_categories = [cat for cat in category_rates.keys() if cat not in valid_categories]
        
        if invalid_categories:
            return jsonify({
                'error': f"Invalid categories: {', '.join(invalid_categories)}",
                'valid_categories': valid_categories
            }), 400
        
        # Update the rates
        success, message = ppo_updater.update_rate_by_category(
            state=state,
            tin=tin,
            provider_name=provider_name,
            category_rates=category_rates
        )
        
        if not success:
            return jsonify({'error': message}), 500
            
        # Return success message with details
        total_procs = sum(len(PPOUpdater.get_procedures_in_category(cat)) for cat in category_rates.keys())
        
        return jsonify({
            'success': True,
            'message': f"Successfully updated rates for {total_procs} procedures across {len(category_rates)} categories",
            'details': {
                'tin': tin,
                'provider_name': provider_name,
                'categories': list(category_rates.keys()),
                'total_procedures': total_procs
            }
        })
    except Exception as e:
        logger.error(f"Error updating category rates: {e}")
        return jsonify({'error': str(e)}), 500

@rate_corrections_bp.route('/api/pdf/<filename>', methods=['GET'])
def get_pdf(filename):
    """Serve the PDF file for the bill."""
    try:
        # Convert JSON filename to PDF filename
        pdf_filename = Path(filename).stem + '.pdf'
        pdf_path = config.FOLDERS['PDF_FOLDER'] / pdf_filename
        
        if not pdf_path.exists():
            return jsonify({'error': 'PDF not found'}), 404
            
        return send_file(pdf_path, mimetype='application/pdf')
    except Exception as e:
        logger.error(f"Error serving PDF {filename}: {e}")
        return jsonify({'error': str(e)}), 500

@rate_corrections_bp.route('/api/resolve', methods=['POST'])
def resolve_rate_failure():
    """Mark a rate failure as resolved after corrections."""
    try:
        data = request.json
        tin = data.get('tin', '')
        action = data.get('action', 'category_update')
        details = data.get('details', {})
        
        if not tin:
            return jsonify({'error': 'TIN is required'}), 400
        
        # For now, we'll just return success
        # In a real implementation, you would:
        # 1. Update the failure records to mark them as resolved
        # 2. Possibly move the files to a "resolved" folder
        # 3. Create an audit log entry of the resolution
        
        return jsonify({
            'success': True, 
            'message': f'Rate failures for TIN {tin} marked as resolved',
            'action': action,
            'details': details
        })
    except Exception as e:
        logger.error(f"Error resolving rate failures: {e}")
        return jsonify({'error': str(e)}), 500
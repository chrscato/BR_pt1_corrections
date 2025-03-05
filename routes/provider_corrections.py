"""
Routes for the Provider Corrections functionality.
"""
from flask import Blueprint, jsonify, request, render_template, send_file
import json
import logging
import os
from pathlib import Path
from services.provider_updater import ProviderUpdater
import config

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Blueprint
provider_corrections_bp = Blueprint('provider_corrections', __name__)

@provider_corrections_bp.route('/')
def index():
    """Render the provider corrections interface."""
    return render_template('provider_corrections/index.html')

@provider_corrections_bp.route('/api/providers/missing_from_failures', methods=['GET'])
def list_missing_providers_from_failures():
    """
    Fetch providers with missing details from the latest validation failures JSON.
    """
    try:
        log_dir = Path(config.VALIDATION_LOGS_PATH)
        failures_files = list(log_dir.glob('validation_failures_*.json'))

        if not failures_files:
            return jsonify({'error': 'No validation failure files found', 'providers': []}), 404

        # Get the latest validation failures file
        latest_file = sorted(failures_files, key=os.path.getmtime, reverse=True)[0]

        # Load JSON content
        with open(latest_file, 'r', encoding='utf-8') as f:
            all_failures = json.load(f)

        missing_providers = []

        for failure in all_failures:
            provider = failure.get("provider_info", {})
            primary_key = provider.get("PrimaryKey")

            if not primary_key:
                continue  # Skip entries without a PrimaryKey

            # Check for missing critical fields
            missing_fields = []
            for field in ["Billing Address 1", "Billing Address City", "Billing Address Postal Code",
                          "Billing Address State", "Billing Name", "Provider Network", "Provider Status",
                          "Provider Type", "TIN"]:
                if provider.get(field) is None:
                    missing_fields.append(field)

            if missing_fields:
                provider["missing_fields"] = missing_fields
                provider["file_name"] = failure.get("file_name", "Unknown")
                provider["date_of_service"] = failure.get("date_of_service", "Unknown")
                missing_providers.append(provider)

        return jsonify({
            "providers": missing_providers,
            "total": len(missing_providers)
        })

    except Exception as e:
        logger.error(f"Error listing missing providers from failures: {e}")
        return jsonify({'error': str(e), 'providers': []}), 500

@provider_corrections_bp.route('/api/pdf/<filename>', methods=['GET'])
def get_pdf(filename):
    """Serve a PDF file for viewing."""
    try:
        pdf_filename = Path(filename).stem + '.pdf'
        pdf_path = config.FOLDERS['PDF_FOLDER'] / pdf_filename

        if not pdf_path.exists():
            return jsonify({'error': 'PDF not found'}), 404

        return send_file(pdf_path, mimetype='application/pdf')

    except Exception as e:
        logger.error(f"Error serving PDF {filename}: {e}")
        return jsonify({'error': str(e)}), 500

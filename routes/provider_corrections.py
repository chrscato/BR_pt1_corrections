"""
Routes for the Provider Corrections functionality.
"""
from flask import Blueprint, jsonify, request, render_template, send_file
import json
import logging
import os
from pathlib import Path
from services.provider_updater import ProviderUpdater
from services.database import get_db_connection
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
    Then verify against the database which fields are still actually missing.
    """
    try:
        log_dir = Path(config.VALIDATION_LOGS_PATH)
        failures_files = list(log_dir.glob('validation_failures_*.json'))

        if not failures_files:
            return jsonify({'error': 'No validation failure files found', 'providers': []}), 404

        # Get the latest validation failures file
        latest_file = sorted(failures_files, key=os.path.getmtime, reverse=True)[0]
        logger.info(f"Using validation failures file: {latest_file}")

        # Load JSON content
        with open(latest_file, 'r', encoding='utf-8') as f:
            all_failures = json.load(f)

        # Get database connection
        db = get_db_connection()
        cursor = db.cursor()

        missing_providers = []
        processed_primary_keys = set()  # Track processed providers to avoid duplicates

        for failure in all_failures:
            provider = failure.get("provider_info", {})
            primary_key = provider.get("PrimaryKey")

            if not primary_key or primary_key in processed_primary_keys:
                continue

            processed_primary_keys.add(primary_key)

            # Query the database for current provider data
            try:
                cursor.execute("""
                    SELECT 
                        "Billing Address 1",
                        "Billing Address City",
                        "Billing Address Postal Code",
                        "Billing Address State",
                        "Billing Name",
                        "Provider Network",
                        "Provider Status",
                        "Provider Type",
                        "TIN"
                    FROM providers 
                    WHERE PrimaryKey = ?
                """, (primary_key,))
                
                db_provider = cursor.fetchone()
                
                # Check which fields are still missing
                missing_fields = []
                if db_provider:
                    for field in ["Billing Address 1", "Billing Address City", "Billing Address Postal Code",
                                "Billing Address State", "Billing Name", "Provider Network", "Provider Status",
                                "Provider Type", "TIN"]:
                        if not db_provider.get(field):
                            missing_fields.append(field)
                else:
                    # If provider not in DB, use all fields from failure
                    missing_fields = ["Billing Address 1", "Billing Address City", "Billing Address Postal Code",
                                    "Billing Address State", "Billing Name", "Provider Network", "Provider Status",
                                    "Provider Type", "TIN"]

                if missing_fields:  # Only include provider if they still have missing fields
                    provider["missing_fields"] = missing_fields
                    provider["file_name"] = failure.get("file_name", "Unknown")
                    provider["date_of_service"] = failure.get("date_of_service", "Unknown")
                    missing_providers.append(provider)

            except Exception as e:
                logger.error(f"Error processing provider {primary_key}: {str(e)}")
                continue

        cursor.close()
        db.close()

        logger.info(f"Found {len(missing_providers)} providers with missing fields")
        return jsonify({
            "providers": missing_providers,
            "total": len(missing_providers)
        })

    except Exception as e:
        logger.error(f"Error listing missing providers from failures: {e}")
        return jsonify({'error': str(e)}), 500

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

@provider_corrections_bp.route('/api/provider/update', methods=['POST'])
def update_provider():
    """
    API endpoint to update provider details in the database.
    """
    try:
        data = request.json  # Get the JSON request body
        primary_key = data.get("primary_key")
        updates = data.get("updates", {})

        if not primary_key:
            return jsonify({'error': 'Primary key is required'}), 400

        if not updates:
            return jsonify({'error': 'No updates provided'}), 400

        # Initialize the ProviderUpdater and attempt the update
        updater = ProviderUpdater()
        update_success = updater.update_provider(primary_key, updates)

        if update_success:
            return jsonify({'success': True, 'message': 'Provider updated successfully'})
        else:
            return jsonify({'error': 'Failed to update provider'}), 500

    except Exception as e:
        logger.error(f"Error updating provider: {e}")
        return jsonify({'error': str(e)}), 500

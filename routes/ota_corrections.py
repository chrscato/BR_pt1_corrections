"""
OTA Corrections Routes for Medical Billing Processing

This module handles routes for identifying and correcting rate-related 
issues for out-of-network providers.
"""

import json
import logging
from pathlib import Path
from typing import Dict, List, Any

from flask import Blueprint, jsonify, request, render_template
import sqlite3
import pandas as pd

from config import BASE_PATH, DB_PATH
from services.ppo_updater import PPOUpdater
from services.database import get_db_connection

# Configure logging
logger = logging.getLogger(__name__)

# Create Blueprint
ota_corrections_bp = Blueprint('ota_corrections', __name__)

@ota_corrections_bp.route('/')
def index():
    """Render the OTA corrections dashboard."""
    return render_template('ota_corrections/index.html')

def get_validation_failures() -> List[Dict[str, Any]]:
    """
    Retrieve the most recent validation failures JSON file.
    
    Returns:
        List of validation failure records
    """
    validation_logs_path = BASE_PATH / "validation logs"
    
    # Check if directory exists
    if not validation_logs_path.exists():
        logger.error(f"Validation logs directory not found at {validation_logs_path}")
        return []
    
    # Find the most recent validation failures file
    failures_files = list(validation_logs_path.glob('validation_failures_*.json'))
    
    if not failures_files:
        logger.warning("No validation failure files found")
        return []
    
    # Get the most recent file
    latest_file = max(failures_files, key=lambda f: f.stat().st_mtime)
    
    try:
        with open(latest_file, 'r', encoding='utf-8') as f:
            failures = json.load(f)
            # Validate the structure of each failure
            validated_failures = []
            for failure in failures:
                if not isinstance(failure, dict):
                    continue
                if 'validation_type' not in failure:
                    continue
                if 'provider_info' not in failure or not isinstance(failure['provider_info'], dict):
                    continue
                validated_failures.append(failure)
            return validated_failures
    except Exception as e:
        logger.error(f"Error reading validation failures file: {e}")
        return []

@ota_corrections_bp.route('/api/providers/missing-rates', methods=['GET'])
def get_ota_providers_missing_rates():
    """
    Retrieve out-of-network providers with missing rate information.
    
    Returns:
        JSON response with provider rate failure details
    """
    try:
        # Get database connection
        db = get_db_connection()
        cursor = db.cursor()
        
        # Get all validation failures
        all_failures = get_validation_failures()
        
        # Filter for rate-related failures and out-of-network providers
        rate_failures = []
        for failure in all_failures:
            if failure.get('validation_type') != 'rate':
                continue
                
            provider_info = failure.get('provider_info', {})
            network = provider_info.get('Provider Network', '')
            
            # Skip if network is None or empty
            if not network:
                continue
                
            # Check if provider is out-of-network
            network_lower = network.lower()
            if any(term in network_lower for term in ['out of network', 'out-of-network', 'ota']):
                rate_failures.append(failure)
        
        # Group failures by provider
        providers = {}
        for failure in rate_failures:
            # Extract provider information
            provider_info = failure.get('provider_info', {})
            tin = provider_info.get('TIN', '')
            
            # Clean TIN
            tin = ''.join(c for c in str(tin) if c.isdigit())
            if len(tin) != 9:
                continue
            
            if tin not in providers:
                providers[tin] = {
                    'tin': tin,
                    'name': provider_info.get('DBA Name Billing Name', 'Unknown Provider'),
                    'network': provider_info.get('Provider Network', 'Unknown'),
                    'total_line_items': 0,
                    'missing_rate_line_items': 0,
                    'cpt_codes': set()
                }
            
            # Check rates array for missing rates
            rates = failure.get('rates', [])
            for rate in rates:
                cpt_code = rate.get('cpt')
                if not cpt_code:
                    continue
                    
                # Check if rate exists in current_otas table
                order_id = failure.get('order_id')
                if order_id:
                    cursor.execute("""
                        SELECT rate FROM current_otas 
                        WHERE ID_Order_PrimaryKey = ? AND CPT = ?
                    """, (order_id, cpt_code))
                    
                    existing_rate = cursor.fetchone()
                    if not existing_rate:
                        providers[tin]['missing_rate_line_items'] += 1
                        providers[tin]['cpt_codes'].add(cpt_code)
                
                providers[tin]['total_line_items'] += 1
        
        cursor.close()
        db.close()
        
        # Convert CPT code sets to lists for JSON serialization
        for provider in providers.values():
            provider['cpt_codes'] = list(provider['cpt_codes'])
        
        return jsonify({
            'providers': list(providers.values()),
            'total': len(providers)
        })
        
    except Exception as e:
        logger.error(f"Error getting OTA providers with missing rates: {e}")
        return jsonify({'error': str(e)}), 500

@ota_corrections_bp.route('/api/provider/details', methods=['GET'])
def get_ota_provider_details():
    """
    Get detailed information about a specific out-of-network provider's rate failures.
    
    Query Parameters:
        tin (str): Provider's Tax Identification Number
    """
    try:
        tin = request.args.get('tin')
        if not tin:
            return jsonify({'error': 'TIN is required'}), 400
        
        # Clean TIN
        tin = ''.join(c for c in str(tin) if c.isdigit())
        if len(tin) != 9:
            return jsonify({'error': 'Invalid TIN format'}), 400
        
        # Get database connection
        db = get_db_connection()
        cursor = db.cursor()
        
        # Get all validation failures
        all_failures = get_validation_failures()
        
        # Filter for this provider's rate failures
        provider_failures = []
        provider_info = None
        network = 'Out of Network'  # Default network status
        
        for failure in all_failures:
            if failure.get('validation_type') != 'rate':
                continue
                
            current_provider_info = failure.get('provider_info', {})
            hcfa = failure.get('hcfa', {})
            raw_data = hcfa.get('raw_data', {})
            billing_info = raw_data.get('billing_info', {})
            
            # Check both provider_info TIN and billing_provider_tin
            provider_tin = current_provider_info.get('TIN', '')
            billing_tin = billing_info.get('billing_provider_tin', '')
            
            # Clean both TINs
            provider_tin = ''.join(c for c in str(provider_tin) if c.isdigit())
            billing_tin = ''.join(c for c in str(billing_tin) if c.isdigit())
            
            # Skip if neither TIN matches
            if provider_tin != tin and billing_tin != tin:
                continue
                
            # Store provider info from first matching failure
            if not provider_info:
                provider_info = current_provider_info
                network = current_provider_info.get('Provider Network', 'Out of Network')
                
            # Check if provider is out-of-network
            network_lower = network.lower()
            if any(term in network_lower for term in ['out of network', 'out-of-network', 'ota']):
                provider_failures.append(failure)
        
        # If no provider info found, return empty response
        if not provider_info:
            return jsonify({
                'provider_info': {
                    'tin': tin,
                    'name': 'Unknown Provider',
                    'network_status': 'Out of Network'
                },
                'cpt_summaries': {},
                'current_rates': []
            })
        
        # Process CPT summaries and current rates
        cpt_summaries = {}
        current_rates = []
        
        for failure in provider_failures:
            order_id = failure.get('order_id')
            rates = failure.get('rates', [])
            
            for rate in rates:
                cpt_code = rate.get('cpt')
                if not cpt_code:
                    continue
                
                # Get current rate if it exists
                cursor.execute("""
                    SELECT rate, modifier FROM current_otas 
                    WHERE ID_Order_PrimaryKey = ? AND CPT = ?
                """, (order_id, cpt_code))
                
                result = cursor.fetchone()
                if result:
                    current_rates.append({
                        'cpt': cpt_code,
                        'rate': result['rate'],
                        'modifier': result['modifier']
                    })
                
                # Create or update CPT summary using only JSON data
                if cpt_code not in cpt_summaries:
                    cpt_summaries[cpt_code] = {
                        'patient_name': failure.get('patient_name', 'Unknown'),
                        'date_of_service': failure.get('date_of_service', 'Unknown'),
                        'order_id': order_id,
                        'charge': rate.get('charge', 0),
                        'validated_rate': rate.get('validated_rate', 0),
                        'status': rate.get('status', 'pending')
                    }
        
        cursor.close()
        db.close()
        
        return jsonify({
            'provider_info': {
                'tin': tin,
                'name': provider_info.get('DBA Name Billing Name', 'Unknown Provider'),
                'network_status': network
            },
            'cpt_summaries': cpt_summaries,
            'current_rates': current_rates
        })
        
    except Exception as e:
        logger.error(f"Error getting provider details: {e}")
        return jsonify({'error': str(e)}), 500

@ota_corrections_bp.route('/api/corrections/line-items', methods=['POST'])
def save_ota_line_item_corrections():
    """
    Save line item rate corrections for an out-of-network provider
    """
    try:
        data = request.json
        tin = data.get('tin')
        line_items = data.get('line_items', [])
        
        if not tin or not line_items:
            return jsonify({'error': 'TIN and line items are required'}), 400
        
        # Get database connection
        db = get_db_connection()
        cursor = db.cursor()
        
        # Track updates
        successful_updates = []
        failed_updates = []
        
        for item in line_items:
            order_id = item.get('ID_Order_PrimaryKey')
            cpt_code = item.get('cpt_code')
            rate = item.get('rate')
            modifier = item.get('modifier', '')
            
            if not order_id or not cpt_code or not rate:
                failed_updates.append({
                    'order_id': order_id,
                    'cpt_code': cpt_code,
                    'reason': 'Missing required fields'
                })
                continue
            
            # Validate rate
            try:
                rate = float(rate)
                if rate <= 0:
                    raise ValueError("Rate must be positive")
            except ValueError:
                failed_updates.append({
                    'order_id': order_id,
                    'cpt_code': cpt_code,
                    'reason': 'Invalid rate value'
                })
                continue
            
            try:
                # Insert or update rate in current_otas table
                cursor.execute("""
                    INSERT INTO current_otas (ID_Order_PrimaryKey, CPT, modifier, rate)
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT(ID_Order_PrimaryKey, CPT) 
                    DO UPDATE SET rate = ?, modifier = ?
                """, (order_id, cpt_code, modifier, rate, rate, modifier))
                
                db.commit()
                successful_updates.append({
                    'order_id': order_id,
                    'cpt_code': cpt_code,
                    'rate': rate
                })
                
            except Exception as e:
                db.rollback()
                failed_updates.append({
                    'order_id': order_id,
                    'cpt_code': cpt_code,
                    'reason': str(e)
                })
        
        cursor.close()
        db.close()
        
        return jsonify({
            'success': len(failed_updates) == 0,
            'successful_updates': successful_updates,
            'failed_updates': failed_updates
        })
        
    except Exception as e:
        logger.error(f"Error saving OTA line item corrections: {e}")
        return jsonify({'error': str(e)}), 500

@ota_corrections_bp.route('/api/corrections/category', methods=['POST'])
def save_ota_category_corrections():
    """
    Save category-based rate corrections for an out-of-network provider
    """
    try:
        data = request.json
        tin = data.get('tin')
        category_rates = data.get('category_rates', {})
        
        if not tin or not category_rates:
            return jsonify({'error': 'TIN and category rates are required'}), 400
        
        # Initialize PPO updater
        ppo_updater = PPOUpdater(DB_PATH)
        
        # Update rates by category
        success, message = ppo_updater.update_rate_by_category(
            state='XX',  # Default state
            tin=tin,
            provider_name='Unknown Provider',
            category_rates=category_rates
        )
        
        if success:
            # Calculate total procedures updated
            total_procedures = sum(
                len(ppo_updater.get_procedures_in_category(category)) 
                for category in category_rates
            )
            
            return jsonify({
                'success': True,
                'message': message,
                'total_procedures_updated': total_procedures,
                'categories_updated': list(category_rates.keys())
            })
        else:
            return jsonify({
                'success': False,
                'error': message
            }), 500
    
    except Exception as e:
        logger.error(f"Error saving OTA category corrections: {e}")
        return jsonify({'error': str(e)}), 500

@ota_corrections_bp.route('/api/line-item/save', methods=['POST'])
def save_line_item():
    """
    Save a corrected rate for a line item
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Extract required fields
        cpt_code = data.get('cpt_code')
        current_rate = data.get('current_rate')
        current_modifier = data.get('current_modifier')
        order_id = data.get('order_id')

        if not cpt_code or current_rate is None:
            return jsonify({'error': 'Missing required fields'}), 400

        # Get database connection
        db = get_db_connection()
        cursor = db.cursor()

        try:
            # Check if an entry already exists for this CPT code
            cursor.execute("""
                SELECT ID_Order_PrimaryKey FROM current_otas 
                WHERE CPT = ? AND ID_Order_PrimaryKey = ?
            """, (cpt_code, order_id))

            existing = cursor.fetchone()

            if existing:
                # Update existing entry
                cursor.execute("""
                    UPDATE current_otas 
                    SET rate = ?, modifier = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE CPT = ? AND ID_Order_PrimaryKey = ?
                """, (current_rate, current_modifier, cpt_code, order_id))
            else:
                # Insert new entry
                cursor.execute("""
                    INSERT INTO current_otas (CPT, rate, modifier, ID_Order_PrimaryKey)
                    VALUES (?, ?, ?, ?)
                """, (cpt_code, current_rate, current_modifier, order_id))

            db.commit()
            return jsonify({'success': True})

        finally:
            cursor.close()
            db.close()

    except Exception as e:
        logger.error(f"Error saving line item: {str(e)}")
        return jsonify({'error': str(e)}), 500 
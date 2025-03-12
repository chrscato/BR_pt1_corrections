"""
Rate Corrections Routes for Medical Billing Processing

This module handles routes for identifying and correcting rate-related 
issues in medical billing records.
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

# Configure logging
logger = logging.getLogger(__name__)

# Create Blueprint
rate_corrections_bp = Blueprint('rate_corrections', __name__)

def get_validation_failures() -> List[Dict[str, Any]]:
    """
    Retrieve the most recent validation failures JSON file.
    
    Returns:
        List of validation failure records
    """
    validation_logs_path = BASE_PATH / "validation logs"
    
    # Find the most recent validation failures file
    failures_files = list(validation_logs_path.glob('validation_failures_*.json'))
    
    if not failures_files:
        logger.warning("No validation failure files found")
        return []
    
    # Get the most recent file
    latest_file = max(failures_files, key=lambda f: f.stat().st_mtime)
    
    try:
        with open(latest_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error reading validation failures file: {e}")
        return []

@rate_corrections_bp.route('/api/providers/missing-rates', methods=['GET'])
def get_providers_missing_rates():
    """
    Retrieve providers with missing rate information.
    
    Returns:
        JSON response with provider rate failure details
    """
    try:
        # Get all validation failures
        all_failures = get_validation_failures()
        
        # Filter for rate-related failures
        rate_failures = [
            f for f in all_failures 
            if f.get('validation_type') == 'rate'
        ]
        
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
                    'missing_category_line_items': 0,
                    'cpt_codes': set()
                }
            
            # Count line items and CPT codes
            if failure.get('rates'):
                providers[tin]['total_line_items'] += len(failure['rates'])
                providers[tin]['missing_rate_line_items'] += sum(
                    1 for rate in failure['rates'] if not rate.get('rate')
                )
                providers[tin]['missing_category_line_items'] += sum(
                    1 for rate in failure['rates'] if not rate.get('category') or rate.get('category') == 'Uncategorized'
                )
                
                # Track unique CPT codes
                providers[tin]['cpt_codes'].update(
                    rate.get('cpt') for rate in failure['rates'] if rate.get('cpt')
                )
        
        # Convert set to list for JSON serialization
        for provider in providers.values():
            provider['cpt_codes'] = list(provider['cpt_codes'])
        
        return jsonify(list(providers.values()))
    
    except Exception as e:
        logger.error(f"Error retrieving providers with missing rates: {e}")
        return jsonify({'error': str(e)}), 500

@rate_corrections_bp.route('/api/provider/details', methods=['GET'])
def get_provider_rate_details():
    """
    Get detailed rate information for a specific provider (TIN)
    """
    try:
        tin = request.args.get('tin')
        if not tin:
            return jsonify({'error': 'TIN is required'}), 400

        # Get all validation failures
        all_failures = get_validation_failures()
        
        # Filter failures for this TIN
        provider_failures = [
            f for f in all_failures 
            if f.get('validation_type') == 'rate' and 
               f.get('provider_info', {}).get('TIN', '').replace('-', '') == tin.replace('-', '')
        ]
        
        # Prepare detailed information
        details = {
            'tin': tin,
            'total_line_items': 0,
            'missing_rate_items': [],
            'current_rates': [],
            'possible_categories': {}
        }
        
        # Process failures
        for failure in provider_failures:
            if failure.get('rates'):
                details['total_line_items'] += len(failure['rates'])
                
                for rate_item in failure['rates']:
                    # Track missing rate items
                    if not rate_item.get('rate'):
                        details['missing_rate_items'].append({
                            'cpt_code': rate_item.get('cpt', ''),
                            'description': rate_item.get('description', ''),
                            'current_category': rate_item.get('category', 'Uncategorized')
                        })
        
        # Get current rates from PPO database
        ppo_updater = PPOUpdater(DB_PATH)
        current_rates_df = ppo_updater.get_provider_rates(tin)
        
        if not current_rates_df.empty:
            details['current_rates'] = current_rates_df.to_dict('records')
        
        # Get all possible categories from PPOUpdater
        categories = ppo_updater.get_all_categories()
        for category in categories:
            details['possible_categories'][category] = {
                'cpt_codes': ppo_updater.get_procedures_in_category(category),
                'total_codes': len(ppo_updater.get_procedures_in_category(category))
            }
        
        return jsonify(details)
    
    except Exception as e:
        logger.error(f"Error retrieving provider rate details: {e}")
        return jsonify({'error': str(e)}), 500

@rate_corrections_bp.route('/api/corrections/line-items', methods=['POST'])
def save_line_item_corrections():
    """
    Save line item rate corrections for a provider
    """
    try:
        data = request.json
        tin = data.get('tin')
        line_items = data.get('line_items', [])
        
        if not tin or not line_items:
            return jsonify({'error': 'TIN and line items are required'}), 400
        
        # Initialize PPO updater
        ppo_updater = PPOUpdater(DB_PATH)
        
        # Track updates
        successful_updates = []
        failed_updates = []
        
        for item in line_items:
            cpt_code = item.get('cpt_code')
            rate = item.get('rate')
            category = item.get('category', '')
            
            if not cpt_code or not rate:
                failed_updates.append({
                    'cpt_code': cpt_code,
                    'reason': 'Missing CPT code or rate'
                })
                continue
            
            # Validate rate
            try:
                rate = float(rate)
                if rate <= 0:
                    raise ValueError("Rate must be positive")
            except ValueError:
                failed_updates.append({
                    'cpt_code': cpt_code,
                    'reason': 'Invalid rate value'
                })
                continue
            
            # Update single rate
            success, message = ppo_updater.update_single_rate(
                state='XX',  # Default state
                tin=tin,
                provider_name='Unknown Provider',
                proc_cd=cpt_code,
                modifier='',
                rate=rate
            )
            
            if success:
                successful_updates.append({
                    'cpt_code': cpt_code,
                    'rate': rate,
                    'category': category
                })
            else:
                failed_updates.append({
                    'cpt_code': cpt_code,
                    'reason': message
                })
        
        return jsonify({
            'successful_updates': successful_updates,
            'failed_updates': failed_updates,
            'total_processed': len(line_items),
            'total_successful': len(successful_updates),
            'total_failed': len(failed_updates)
        })
    
    except Exception as e:
        logger.error(f"Error saving line item corrections: {e}")
        return jsonify({'error': str(e)}), 500

@rate_corrections_bp.route('/api/corrections/category', methods=['POST'])
def save_category_corrections():
    """
    Save category-based rate corrections for a provider
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
        logger.error(f"Error saving category corrections: {e}")
        return jsonify({'error': str(e)}), 500
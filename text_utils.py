"""
Text processing utilities for normalizing text and handling patient names and dates.
"""
import unicodedata
from datetime import datetime, timedelta
from pathlib import Path

def validate_filename(filename):
    """
    Sanitize filename to prevent path traversal.
    
    Args:
        filename (str): The filename to sanitize
        
    Returns:
        str: Sanitized filename (basename only)
    """
    return Path(filename).name

def enhanced_normalize_text(text):
    """
    Enhanced text normalization that handles accented characters, 
    special characters, and standardizes text format for matching.
    
    Args:
        text (str): The text to normalize
        
    Returns:
        str: Normalized text (uppercase, no spaces, no special chars)
    """
    if not text:
        return ""
    
    # Convert to string if not already
    text = str(text)
    
    # Convert to ASCII where possible (handle accented characters)
    # NFKD decomposition helps with accented characters 
    text = unicodedata.normalize('NFKD', text).encode('ASCII', 'ignore').decode('ASCII')
    
    # Remove non-alphanumeric characters and convert to uppercase
    normalized = ''.join(char for char in text.upper() if char.isalnum())
    
    return normalized

def split_patient_name(name):
    """
    Split a patient name into first and last name components.
    Handles commas, extra spaces, and various formats.
    
    Args:
        name (str): Full patient name
        
    Returns:
        tuple: (first_name, last_name) - either may be None if not found
    """
    if not name:
        return None, None
        
    # Remove extra spaces and normalize
    name = ' '.join(name.strip().split())
    
    # Handle "LastName, FirstName" format
    if ',' in name:
        parts = [p.strip() for p in name.split(',', 1)]
        if len(parts) == 2:
            return parts[1], parts[0]  # FirstName, LastName
    
    # Handle standard "FirstName LastName" format
    parts = name.split()
    if len(parts) == 1:
        return None, parts[0]  # Just a last name
    elif len(parts) == 2:
        return parts[0], parts[1]  # First and last
    else:
        # If more than 2 parts, assume first name and then last name is the final part
        return parts[0], parts[-1]

def parse_date(date_str):
    """
    Parse a date string in various formats.
    
    Args:
        date_str (str): Date string in various formats
        
    Returns:
        datetime: Parsed datetime object or None if parsing fails
    """
    if not date_str:
        return None
        
    date_formats = ["%Y-%m-%d", "%m/%d/%Y", "%Y%m%d", "%m-%d-%Y"]
    for fmt in date_formats:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    return None

def get_date_range(date_str, months_range=3):
    """
    Get a date range around a target date.
    
    Args:
        date_str (str): Target date string
        months_range (int): Number of months before and after the target date
        
    Returns:
        tuple: (start_date, end_date) as strings in YYYY-MM-DD format, or (None, None) if parsing fails
    """
    date_obj = parse_date(date_str)
    if not date_obj:
        return None, None
        
    start_date = (date_obj - timedelta(days=30 * months_range)).strftime("%Y-%m-%d")
    end_date = (date_obj + timedelta(days=30 * months_range)).strftime("%Y-%m-%d")
    
    return start_date, end_date

def format_currency(amount):
    """
    Format a number as a currency string.
    
    Args:
        amount (float/str): The amount to format
        
    Returns:
        str: Formatted currency string (e.g., "$123.45")
    """
    try:
        # Remove any existing currency symbols or commas
        if isinstance(amount, str):
            amount = amount.replace('$', '').replace(',', '')
        return f"${float(amount):.2f}"
    except (ValueError, TypeError):
        return "$0.00"

def parse_charge(charge):
    """
    Parse a charge amount, handling dollar signs and formatting.
    
    Args:
        charge (str or float): The charge amount to parse
        
    Returns:
        float: The numeric value of the charge
    """
    if isinstance(charge, (int, float)):
        return float(charge)
    
    if not charge:
        return 0.0
        
    # Remove dollar signs, commas, and spaces
    charge_str = str(charge).replace('$', '').replace(',', '').strip()
    
    try:
        return float(charge_str)
    except ValueError:
        return 0.0
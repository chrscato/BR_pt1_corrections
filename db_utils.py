"""
Database utilities for connecting to the database and performing queries.
"""
import sqlite3
from fuzzywuzzy import fuzz
import config
from text_utils import enhanced_normalize_text, get_date_range

def get_db_connection():
    """
    Get a connection to the SQLite database.
    
    Returns:
        sqlite3.Connection: Database connection object
    """
    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def search_by_name_and_dos(first_name=None, last_name=None, dos_date=None, months_range=None, limit=None):
    """
    Search database by first and last name with enhanced fuzzy matching and DOS within a range.
    Handles text normalization for improved matching.
    
    Args:
        first_name (str): Patient's first name
        last_name (str): Patient's last name
        dos_date (str): Date of service in any recognized format
        months_range (int): Number of months before and after DOS to include in search
        limit (int): Maximum number of results to return
        
    Returns:
        list: List of matching records with match scores and proximity information
    """
    # Use default values from config if not provided
    months_range = months_range or config.DEFAULT_MONTHS_RANGE
    limit = limit or config.MAX_SEARCH_RESULTS
    
    conn = get_db_connection()
    
    try:
        # Base query with broad matching criteria
        query = """
        SELECT DISTINCT o.Order_ID, o.FileMaker_Record_Number, o.Patient_Last_Name, o.Patient_First_Name, 
        o.PatientName, GROUP_CONCAT(DISTINCT li.DOS) as DOS_List,
        GROUP_CONCAT(DISTINCT li.CPT) as CPT_List,
        GROUP_CONCAT(DISTINCT li.Description) as Description_List
        FROM orders o
        LEFT JOIN line_items li ON o.Order_ID = li.Order_ID
        WHERE 1=1
        """
        
        params = []
        
        # Add last name filter with broader matching if provided
        if last_name:
            # Use broader matching for better recall
            query += " AND (o.Patient_Last_Name LIKE ? OR o.Patient_Last_Name LIKE ?)"
            # Make the match broader by only using the first few characters
            name_prefix = last_name[:min(4, len(last_name))] if len(last_name) > 2 else last_name
            params.append(f"{name_prefix}%")
            params.append(f"%{name_prefix}%")
            
        # Add first name filter with broader matching if provided
        if first_name:
            # Similar broader matching for first name
            query += " AND (o.Patient_First_Name LIKE ? OR o.Patient_First_Name LIKE ?)"
            name_prefix = first_name[:min(3, len(first_name))] if len(first_name) > 2 else first_name
            params.append(f"{name_prefix}%")
            params.append(f"%{name_prefix}%")
        
        # Add date range filter if DOS is provided
        if dos_date:
            start_date, end_date = get_date_range(dos_date, months_range)
            if start_date and end_date:
                # Add to query
                query += " AND li.DOS BETWEEN ? AND ?"
                params.append(start_date)
                params.append(end_date)
        
        # Add limit to prevent too many results
        # Increase the SQL limit to allow for later fuzzy filtering
        sql_limit = min(limit * 3, 200)  # Get more results than needed for fuzzy filtering
        query += " GROUP BY o.Order_ID LIMIT ?"
        params.append(sql_limit)
        
        cursor = conn.cursor()
        cursor.execute(query, params)
        results = [dict(row) for row in cursor.fetchall()]
        
        # Apply fuzzy matching to improve results
        apply_fuzzy_matching(results, first_name, last_name)
        
        # Apply date proximity sorting if DOS is provided
        if dos_date and results:
            apply_date_proximity_sorting(results, dos_date)
        
        return results
    except Exception as e:
        print(f"Database search error: {str(e)}")
        return []
    finally:
        conn.close()

def apply_fuzzy_matching(results, first_name, last_name):
    """
    Apply fuzzy matching to search results and filter/sort by match quality.
    Modifies the results list in place.
    
    Args:
        results (list): List of search results
        first_name (str): First name to match against
        last_name (str): Last name to match against
    """
    if not results or (not first_name and not last_name):
        return
        
    enhanced_results = []
    normalized_search_first = enhanced_normalize_text(first_name) if first_name else ""
    normalized_search_last = enhanced_normalize_text(last_name) if last_name else ""
    
    for result in results:
        # Get normalized versions of the database names
        db_first_name = enhanced_normalize_text(result.get('Patient_First_Name', ''))
        db_last_name = enhanced_normalize_text(result.get('Patient_Last_Name', ''))
        
        # Calculate fuzzy match scores
        first_name_score = fuzz.ratio(normalized_search_first, db_first_name) if normalized_search_first and db_first_name else 0
        last_name_score = fuzz.ratio(normalized_search_last, db_last_name) if normalized_search_last and db_last_name else 0
        
        # Calculate weighted combined score, prioritizing last name
        # If only one name part provided, use only that score
        if normalized_search_first and normalized_search_last:
            # Both names provided, weight last name higher
            combined_score = (last_name_score * 0.7) + (first_name_score * 0.3)
        elif normalized_search_last:
            # Only last name provided
            combined_score = last_name_score
        elif normalized_search_first:
            # Only first name provided
            combined_score = first_name_score
        else:
            combined_score = 0
        
        # Add score to result
        result['match_score'] = combined_score
        
        # Only include results above threshold
        if combined_score >= config.FUZZY_MATCH_THRESHOLD:
            enhanced_results.append(result)
    
    # Replace original results with enhanced fuzzy-matched results
    if enhanced_results:
        results.clear()
        results.extend(enhanced_results)
        
        # Sort by match score in descending order
        results.sort(key=lambda x: x.get('match_score', 0), reverse=True)
        
        # Limit to requested number
        del results[config.MAX_SEARCH_RESULTS:]

def apply_date_proximity_sorting(results, dos_date):
    """
    Sort results by proximity to the target date of service.
    Modifies the results list in place.
    
    Args:
        results (list): List of search results
        dos_date (str): Target date of service
    """
    from text_utils import parse_date
    
    dos_date_obj = parse_date(dos_date)
    if not dos_date_obj:
        return
        
    # Process each result to find closest DOS
    for result in results:
        dos_list = result.get('DOS_List', '').split(',')
        min_days_diff = float('inf')
        closest_dos = None
        
        for dos in dos_list:
            dos = dos.strip()
            if dos:
                dos_obj = parse_date(dos)
                if dos_obj:
                    days_diff = abs((dos_date_obj - dos_obj).days)
                    if days_diff < min_days_diff:
                        min_days_diff = days_diff
                        closest_dos = dos
        
        result['days_from_target'] = min_days_diff if min_days_diff != float('inf') else 999999
        result['closest_dos'] = closest_dos
    
    # Sort by proximity to target date
    results.sort(key=lambda x: x.get('days_from_target', 999999))

def validate_cpt(cpt_code):
    """
    Validate a CPT code against the database.
    
    Args:
        cpt_code (str): CPT code to validate
        
    Returns:
        dict: Validation result with CPT info if found
    """
    if not cpt_code:
        return {'valid': False, 'message': 'No CPT code provided'}
        
    # Clean the CPT code - remove any non-alphanumeric characters
    cpt_code = ''.join(c for c in cpt_code if c.isalnum())
    
    # Query the database for the CPT code
    conn = get_db_connection()
    
    try:
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                SELECT CPT, Description, DefaultFee
                FROM cpt_codes
                WHERE CPT = ?
            """, (cpt_code,))
            
            result = cursor.fetchone()
            
            if result:
                return {
                    'valid': True,
                    'cpt': result['CPT'],
                    'description': result['Description'],
                    'default_fee': result.get('DefaultFee', 0)
                }
            else:
                return {'valid': False, 'message': 'CPT code not found'}
        except sqlite3.OperationalError:
            # Table might not exist
            return {'valid': False, 'message': 'CPT validation not available'}
    finally:
        conn.close()
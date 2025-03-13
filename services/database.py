"""
Database service module for managing database connections and operations.
"""
import sqlite3
import logging
from config import DB_PATH

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def dict_factory(cursor, row):
    """Convert SQLite row to dictionary"""
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

def get_db_connection():
    """
    Create and return a new database connection.
    Uses SQLite database path from config.py
    """
    try:
        # Create connection
        connection = sqlite3.connect(DB_PATH)
        connection.row_factory = dict_factory  # This allows accessing columns by name
        
        logger.info("Database connection established successfully")
        return connection

    except Exception as e:
        logger.error(f"Error connecting to database: {str(e)}")
        raise 
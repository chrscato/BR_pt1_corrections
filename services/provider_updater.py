"""
Provider database updater for fixing missing provider information.
"""
import sqlite3
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, List, Any, Union
import logging

logger = logging.getLogger(__name__)

class ProviderUpdater:
    """
    Class to update provider information in the database.
    """
    
    # Critical fields to check and correct
    CRITICAL_FIELDS = [
        "Billing Name", "Billing Address 1", "Billing Address City",
        "Billing Address State", "Billing Address Postal Code", "TIN",
        "NPI", "Provider Network", "Provider Status", "Provider Type"
    ]
    
    def __init__(self, db_path: Union[str, Path] = None):
        """
        Initialize the provider updater.
        
        Args:
            db_path: Path to the SQLite database
        """
        if db_path is None:
            db_path = Path(r"C:\Users\ChristopherCato\OneDrive - clarity-dx.com\Documents\Bill_Review_INTERNAL\reference_tables\orders2.db")

        self.db_path = Path(db_path)
        if not self.db_path.exists():
            raise FileNotFoundError(f"Database not found: {self.db_path}")

    def connect_db(self) -> sqlite3.Connection:
        """Create a database connection."""
        return sqlite3.connect(self.db_path)

    def update_provider(self, primary_key: str, updates: Dict[str, Any]) -> bool:
        """
        Update a provider in the database.
        
        Args:
            primary_key: The PrimaryKey of the provider
            updates: Dictionary of field-value pairs to update
        
        Returns:
            True if the update is successful, False otherwise.
        """
        try:
            if not primary_key:
                logger.error("Primary key is required")
                return False
            
            if not updates:
                logger.warning(f"No updates provided for provider {primary_key}")
                return False
            
            # Remove invalid fields (NaN, empty strings)
            cleaned_updates = {k: (None if pd.isna(v) or v == "" else v) for k, v in updates.items()}
            
            # Prepare SQL update statement
            set_clauses = [f'"{field}" = ?' for field in cleaned_updates]
            params = list(cleaned_updates.values()) + [primary_key]
            
            query = f"""
                UPDATE providers
                SET {', '.join(set_clauses)}
                WHERE PrimaryKey = ?
            """

            with self.connect_db() as conn:
                cursor = conn.cursor()
                cursor.execute(query, params)
                conn.commit()
                if cursor.rowcount > 0:
                    logger.info(f"Updated provider {primary_key} successfully.")
                    return True
                else:
                    logger.warning(f"No rows updated for provider {primary_key}.")
                    return False

        except Exception as e:
            logger.error(f"Error updating provider {primary_key}: {e}")
            return False

    def get_provider_by_id(self, primary_key: str) -> Dict[str, Any]:
        """
        Retrieve provider details by PrimaryKey.
        
        Args:
            primary_key: The PrimaryKey of the provider
        
        Returns:
            Dictionary with provider details or an empty dict if not found.
        """
        try:
            with self.connect_db() as conn:
                query = "SELECT * FROM providers WHERE PrimaryKey = ?"
                result = pd.read_sql_query(query, conn, params=[primary_key])

            if result.empty:
                return {}

            provider_dict = result.iloc[0].to_dict()

            # Handle missing fields (convert NaN to None)
            for key, value in provider_dict.items():
                if isinstance(value, float) and np.isnan(value):
                    provider_dict[key] = None

            return provider_dict

        except Exception as e:
            logger.error(f"Error retrieving provider {primary_key}: {e}")
            return {}

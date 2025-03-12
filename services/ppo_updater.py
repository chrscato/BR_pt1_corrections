"""
PPO Rate Updater Service

Handles updating and managing provider rates in the database.
"""

import sqlite3
import logging
from typing import Dict, List, Tuple, Union, Any
from pathlib import Path

class PPOUpdater:
    """
    Manages provider rate updates in the PPO rate database.
    """
    
    # Predefined procedure categories
    PROCEDURE_CATEGORIES = {
        "MRI w/o": [
            "70551", "72141", "73721", "70540", "72195", 
            "72146", "73221", "73218"
        ],
        "MRI w/": [
            "70552", "72142", "73722", "70542", "72196", 
            "72147", "73222", "73219"
        ],
        "MRI w/&w/o": [
            "70553", "72156", "73723", "70543", "72197", 
            "72157", "73223", "73220"
        ],
        "CT w/o": [
            "74176", "74150", "72125", "70450", "73700", 
            "72131", "70486", "70480", "72192", "70490", 
            "72128", "71250", "73200"
        ],
        "CT w/": [
            "74177", "74160", "72126", "70460", "73701", 
            "72132", "70487", "70481", "72193", "70491", 
            "72129", "71260", "73201"
        ],
        "CT w/&w/o": [
            "74178", "74170", "72127", "70470", "73702", 
            "72133", "70488", "70482", "72194", "70492", 
            "72130", "71270", "73202"
        ],
        "Xray": [
            "74010", "74000", "74020", "76080", "73050", 
            "73600", "73610", "77072", "77073", "73650", 
            "72040", "72050", "71010", "71021", "71023", 
            "71022", "71020", "71030", "71034", "71035"
        ]
    }

    def __init__(self, db_path: Union[str, Path]):
        """
        Initialize the PPO updater with a database path.
        
        Args:
            db_path: Path to the SQLite database
        """
        self.db_path = Path(db_path)
        self.logger = logging.getLogger(__name__)
        
        # Ensure logging is configured
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            self.logger.setLevel(logging.INFO)

    def _connect(self) -> sqlite3.Connection:
        """
        Create a database connection.
        
        Returns:
            SQLite database connection
        """
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def update_single_rate(
        self, 
        state: str, 
        tin: str, 
        provider_name: str, 
        proc_cd: str, 
        modifier: str, 
        rate: float
    ) -> Tuple[bool, str]:
        """
        Update rate for a single procedure code.
        
        Args:
            state: State of the provider
            tin: Tax ID number
            provider_name: Provider name
            proc_cd: Procedure code
            modifier: Procedure modifier
            rate: Rate to set
        
        Returns:
            Tuple of (success, message)
        """
        try:
            # Clean TIN
            tin = ''.join(c for c in str(tin) if c.isdigit())
            if len(tin) != 9:
                return False, "Invalid TIN format"
            
            # Determine category
            category = self._get_category_for_code(proc_cd)
            
            with self._connect() as conn:
                cursor = conn.cursor()
                
                # Check if entry exists
                cursor.execute("""
                    SELECT COUNT(*) as count 
                    FROM ppo 
                    WHERE TIN = ? AND proc_cd = ? AND modifier = ?
                """, (tin, proc_cd, modifier))
                
                exists = cursor.fetchone()['count'] > 0
                
                if exists:
                    # Update existing entry
                    cursor.execute("""
                        UPDATE ppo 
                        SET RenderingState = ?, 
                            provider_name = ?, 
                            rate = ?,
                            proc_category = ?
                        WHERE TIN = ? AND proc_cd = ? AND modifier = ?
                    """, (state, provider_name, rate, category, tin, proc_cd, modifier))
                else:
                    # Insert new entry
                    cursor.execute("""
                        INSERT INTO ppo 
                        (RenderingState, TIN, provider_name, proc_cd, modifier, proc_category, rate) 
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (state, tin, provider_name, proc_cd, modifier, category, rate))
                
                conn.commit()
                
                return True, f"Successfully updated rate for {proc_cd}"
        
        except sqlite3.Error as e:
            self.logger.error(f"Database error: {e}")
            return False, f"Database error: {e}"
        except Exception as e:
            self.logger.error(f"Unexpected error: {e}")
            return False, f"Unexpected error: {e}"

    def update_rate_by_category(
        self, 
        state: str, 
        tin: str, 
        provider_name: str, 
        category_rates: Dict[str, float]
    ) -> Tuple[bool, str]:
        """
        Update rates for multiple procedure codes by category.
        
        Args:
            state: State of the provider
            tin: Tax ID number
            provider_name: Provider name
            category_rates: Dictionary of category to rate
        
        Returns:
            Tuple of (success, message)
        """
        try:
            # Clean TIN
            tin = ''.join(c for c in str(tin) if c.isdigit())
            if len(tin) != 9:
                return False, "Invalid TIN format"
            
            with self._connect() as conn:
                cursor = conn.cursor()
                
                # Track total updates
                total_updates = 0
                
                for category, rate in category_rates.items():
                    # Get procedure codes for this category
                    proc_codes = self.PROCEDURE_CATEGORIES.get(category, [])
                    
                    for proc_cd in proc_codes:
                        # Update each procedure code
                        cursor.execute("""
                            INSERT OR REPLACE INTO ppo 
                            (RenderingState, TIN, provider_name, proc_cd, modifier, proc_category, rate) 
                            VALUES (?, ?, ?, ?, '', ?, ?)
                        """, (state, tin, provider_name, proc_cd, category, rate))
                        
                        total_updates += 1
                
                conn.commit()
                
                return True, f"Updated {total_updates} procedure rates across {len(category_rates)} categories"
        
        except sqlite3.Error as e:
            self.logger.error(f"Database error: {e}")
            return False, f"Database error: {e}"
        except Exception as e:
            self.logger.error(f"Unexpected error: {e}")
            return False, f"Unexpected error: {e}"

    def get_provider_rates(self, tin: str) -> List[Dict[str, Any]]:
        """
        Retrieve current rates for a specific provider.
        
        Args:
            tin: Tax ID number
        
        Returns:
            List of rate dictionaries
        """
        try:
            # Clean TIN
            tin = ''.join(c for c in str(tin) if c.isdigit())
            if len(tin) != 9:
                return []
            
            with self._connect() as conn:
                cursor = conn.cursor()
                
                cursor.execute("""
                    SELECT proc_cd, proc_category, rate, modifier 
                    FROM ppo 
                    WHERE TIN = ?
                """, (tin,))
                
                # Convert rows to dictionaries
                return [dict(row) for row in cursor.fetchall()]
        
        except sqlite3.Error as e:
            self.logger.error(f"Database error retrieving rates: {e}")
            return []

    def _get_category_for_code(self, proc_cd: str) -> str:
        """
        Determine the category for a given procedure code.
        
        Args:
            proc_cd: Procedure code
        
        Returns:
            Category name or 'Uncategorized'
        """
        for category, codes in self.PROCEDURE_CATEGORIES.items():
            if proc_cd in codes:
                return category
        
        return "Uncategorized"

    @classmethod
    def get_all_categories(cls) -> List[str]:
        """
        Get all defined procedure categories.
        
        Returns:
            List of category names
        """
        return list(cls.PROCEDURE_CATEGORIES.keys())

    @classmethod
    def get_procedures_in_category(cls, category: str) -> List[str]:
        """
        Get all procedure codes for a given category.
        
        Args:
            category: Category name
        
        Returns:
            List of procedure codes
        """
        return cls.PROCEDURE_CATEGORIES.get(category, [])
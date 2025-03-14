"""
Main Flask application for the combined Medical Records Processing tools.
"""
from flask import Flask, jsonify, request, render_template, redirect, url_for
from pathlib import Path
import threading
import time
import webbrowser
import os
import config

# Create and configure app
app = Flask(__name__)
app.config.from_object('config')

# Ensure required directories exist
for folder in config.FOLDERS.values():
    folder.mkdir(parents=True, exist_ok=True)

# Create validation logs directory if it doesn't exist
validation_logs_folder = config.BASE_PATH / "validation logs"
validation_logs_folder.mkdir(parents=True, exist_ok=True)

# Create escalations directory if it doesn't exist
escalations_folder = config.BASE_PATH / r"scripts\VAILIDATION\data\extracts\escalations"
escalations_folder.mkdir(parents=True, exist_ok=True)

# Create rejected directory if it doesn't exist
rejected_folder = config.BASE_PATH / r"scripts\VAILIDATION\data\extracts\rejected"
rejected_folder.mkdir(parents=True, exist_ok=True)

# Import blueprints
from routes.unmapped import unmapped_bp
from routes.corrections import corrections_bp
from routes.escalations import escalations_bp
from routes.rate_corrections import rate_corrections_bp
from routes.provider_corrections import provider_corrections_bp
from routes.ota_corrections import ota_corrections_bp

# Register blueprints
app.register_blueprint(unmapped_bp, url_prefix='/unmapped')
app.register_blueprint(corrections_bp, url_prefix='/corrections')
app.register_blueprint(escalations_bp, url_prefix='/escalations')
app.register_blueprint(rate_corrections_bp, url_prefix='/rate_corrections')
app.register_blueprint(provider_corrections_bp, url_prefix='/provider_corrections')
app.register_blueprint(ota_corrections_bp, url_prefix='/ota_corrections')



@app.route('/test')
def test():
    """Simple test endpoint."""
    return jsonify({
        'status': 'ok',
        'message': 'Application is running'
    })


@app.route('/debug-paths')
def debug_paths():
    results = {
        "folder_paths": {},
        "file_counts": {}
    }
    
    # Show the actual folder paths being used
    for folder_name, folder_path in config.FOLDERS.items():
        results["folder_paths"][folder_name] = str(folder_path)
        
        # Check if path exists
        exists = os.path.exists(folder_path)
        results["folder_paths"][folder_name + "_exists"] = exists
        
        # If exists, count files
        if exists:
            if "PDF" in folder_name:
                file_pattern = "*.pdf"
            else:
                file_pattern = "*.json"
                
            file_count = len(list(Path(folder_path).glob(file_pattern)))
            results["file_counts"][folder_name] = file_count
            
            # List first few files for verification
            if file_count > 0:
                results[folder_name + "_files"] = [f.name for f in list(Path(folder_path).glob(file_pattern))[:5]]
    
    # Add escalations folder info
    escalations_folder = config.BASE_PATH / r"scripts\VAILIDATION\data\extracts\escalations"
    results["folder_paths"]["ESCALATIONS_FOLDER"] = str(escalations_folder)
    results["folder_paths"]["ESCALATIONS_FOLDER_exists"] = os.path.exists(escalations_folder)
    
    if os.path.exists(escalations_folder):
        file_count = len(list(Path(escalations_folder).glob("*.json")))
        results["file_counts"]["ESCALATIONS_FOLDER"] = file_count
        
        if file_count > 0:
            results["ESCALATIONS_FOLDER_files"] = [f.name for f in list(Path(escalations_folder).glob("*.json"))[:5]]
    
    return jsonify(results)


# Add this to app.py for testing
@app.route('/test-files')
def test_files():
    results = {}
    
    # Test if folders exist
    for name, folder in config.FOLDERS.items():
        results[f"{name}_exists"] = folder.exists()
    
    # Check for JSON files
    unmapped_files = list(config.FOLDERS['UNMAPPED_FOLDER'].glob('*.json'))
    results['unmapped_count'] = len(unmapped_files)
    
    if unmapped_files:
        results['sample_unmapped'] = unmapped_files[0].name
    
    # Check for PDF files
    pdf_files = list(config.FOLDERS['PDF_FOLDER'].glob('*.pdf'))
    results['pdf_count'] = len(pdf_files)
    
    if pdf_files:
        results['sample_pdf'] = pdf_files[0].name
    
    return jsonify(results)

@app.route('/')
def home():
    """Render the application homepage with links to tools."""
    unmapped_count = len(list(config.FOLDERS['UNMAPPED_FOLDER'].glob('*.json')))
    corrections_count = len(list(config.FOLDERS['FAILS_FOLDER'].glob('*.json')))
    
    # Count escalations
    escalations_folder = config.BASE_PATH / r"scripts\VAILIDATION\data\extracts\escalations"
    escalations_count = len(list(escalations_folder.glob('*.json'))) if escalations_folder.exists() else 0
    
    return render_template('home.html', 
                          unmapped_count=unmapped_count,
                          corrections_count=corrections_count,
                          escalations_count=escalations_count)

def open_browser():
    """Open the browser after a short delay."""
    time.sleep(2)
    webbrowser.open(f'http://{config.HOST}:{config.PORT}')

if __name__ == "__main__":
    if config.AUTO_OPEN_BROWSER:
        threading.Thread(target=open_browser).start()
    
    app.run(host=config.HOST, port=config.PORT, debug=config.DEBUG)
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

# Import blueprints
from routes.unmapped import unmapped_bp
from routes.corrections import corrections_bp

# Register blueprints
app.register_blueprint(unmapped_bp, url_prefix='/unmapped')
app.register_blueprint(corrections_bp, url_prefix='/corrections')



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
    
    return render_template('home.html', 
                          unmapped_count=unmapped_count,
                          corrections_count=corrections_count)

def open_browser():
    """Open the browser after a short delay."""
    time.sleep(2)
    webbrowser.open(f'http://{config.HOST}:{config.PORT}')

if __name__ == "__main__":
    if config.AUTO_OPEN_BROWSER:
        threading.Thread(target=open_browser).start()
    
    app.run(host=config.HOST, port=config.PORT, debug=config.DEBUG)
/**
 * Main JavaScript functionality for the OCR Corrections tool
 */

let currentFileIndex = 0;
let files = [];
let currentData = null;
let originalData = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadFiles();
    debugPaths();
});

/**
 * Load the list of files that need OCR correction
 */
async function loadFiles() {
    try {
        const response = await fetch('/corrections/api/files');
        const data = await response.json();
        
        // Store the files list
        files = data.files || [];
        
        // Update the file info display
        updateFileInfo();
        
        // Load the first file if available
        if (files.length > 0) {
            loadFile(files[0]);
        } else {
            const content = document.getElementById('content');
            content.innerHTML = '<div class="alert alert-info">No files to correct</div>';
        }
    } catch (error) {
        console.error('Error loading files:', error);
        const fileInfo = document.getElementById('fileInfo');
        fileInfo.innerHTML = '<div class="alert alert-danger">Error loading files</div>';
    }
}

/**
 * Load a specific file for editing
 * @param {string} filename - Filename to load
 */
async function loadFile(filename) {
    try {
        const fileInfo = document.getElementById('fileInfo');
        fileInfo.innerHTML = `<div class="alert alert-info">Loading ${filename}...</div>`;
        
        const response = await fetch(`/corrections/api/file/${filename}`);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Failed to load file');
        }
        
        console.log('Loaded file data:', result);
        currentData = result.data;
        originalData = JSON.parse(JSON.stringify(result.data)); // Deep copy of original data
        
        // Update file info
        fileInfo.innerHTML = `<strong>Current File:</strong> ${filename}`;
        
        // Check if displayData function exists before calling it
        if (typeof displayData === 'function') {
            // Display the data in the UI
            displayData();
        } else {
            console.error('displayData function is not defined!');
            fileInfo.innerHTML = `<div class="alert alert-danger">Error: displayData function is not available. Please check your JavaScript files.</div>`;
        }
        
        // Update button states
        document.getElementById('prevBtn').disabled = currentFileIndex === 0;
        document.getElementById('nextBtn').disabled = currentFileIndex === files.length - 1;
    } catch (error) {
        console.error('Error loading file:', error);
        const fileInfo = document.getElementById('fileInfo');
        fileInfo.innerHTML = `<div class="alert alert-danger">Error loading file: ${error.message}</div>`;
    }
}

/**
 * Load a PDF region and display it as an image
 * @param {string} region - Region name ('header', 'service_lines', etc.)
 */
async function loadPDFRegion(region) {
    if (!files[currentFileIndex]) return;
    
    try {
        const filename = files[currentFileIndex];
        console.log(`Loading PDF region: ${region} for file: ${filename}`);
        
        // Show loading indicator in the image
        const imgElement = document.getElementById(`${region}-image`);
        if (!imgElement) {
            console.error(`Image element not found for ${region}`);
            return;
        }
        
        // Set a loading state
        imgElement.src = '/static/img/error.png'; // Use as a loading placeholder
        
        // Use a consistent approach to fetch the region
        console.log(`Fetching region from: /corrections/api/pdf_region/${filename}/${region}`);
        const response = await fetch(`/corrections/api/pdf_region/${filename}/${region}`);
        console.log(`Response status: ${response.status}`);
        
        if (response.ok) {
            const data = await response.json();
            console.log(`Response data received for ${region}`);
            
            if (data.image) {
                // Directly set the image source - don't test it first
                imgElement.src = data.image;
                console.log(`Image for ${region} set`);
                
                // Add error handler in case image fails to load
                imgElement.onerror = function() {
                    console.error(`Error displaying image for ${region}`);
                    showPDFLink(region, filename);
                };
            } else {
                console.error(`No image data returned for ${region}`);
                if (data.error) {
                    console.error(`Error from server: ${data.error}`);
                }
                showPDFLink(region, filename);
            }
        } else {
            console.error(`Failed to load region: ${response.status}`);
            showPDFLink(region, filename);
        }
    } catch (error) {
        console.error(`Error loading ${region} PDF region:`, error);
        
        // Fall back to showing a link to the full PDF
        if (files[currentFileIndex]) {
            showPDFLink(region, files[currentFileIndex]);
        }
    }
}

/**
 * Show a link to the full PDF when region extraction fails
 * @param {string} region - Region name
 * @param {string} filename - Filename
 */
function showPDFLink(region, filename) {
    const imgElement = document.getElementById(`${region}-image`);
    if (!imgElement) return;
    
    // Set a placeholder image
    imgElement.src = '/static/img/error.png';
    
    // Add a link to open the PDF
    const container = imgElement.parentElement;
    if (container) {
        // Check if we already added a link
        const existingLink = container.querySelector(`.pdf-link-alert-${region}`);
        if (existingLink) return;
        
        const linkElement = document.createElement('div');
        linkElement.className = `alert alert-info mt-2 pdf-link-alert pdf-link-alert-${region}`;
        linkElement.innerHTML = `
            <p>PDF region extraction is currently not working properly for the ${region} region.</p>
            <a href="/corrections/api/pdf/${filename}" target="_blank" class="btn btn-primary btn-sm">
                Open Full PDF
            </a>
        `;
        container.appendChild(linkElement);
    }
}

/**
 * Update the file information display
 */
function updateFileInfo() {
    const info = document.getElementById('fileInfo');
    
    if (files.length === 0) {
        info.innerHTML = '<div class="alert alert-info">No files to review</div>';
        return;
    }
    
    info.innerHTML = `<strong>File ${currentFileIndex + 1} of ${files.length}:</strong> ${files[currentFileIndex]}`;
    
    // Update button states
    document.getElementById('prevBtn').disabled = currentFileIndex === 0;
    document.getElementById('nextBtn').disabled = currentFileIndex === files.length - 1;
}

/**
 * Open the full PDF in a new tab
 */
function openPDF() {
    if (files[currentFileIndex]) {
        const filename = files[currentFileIndex];
        window.open(`/corrections/api/pdf/${filename}`, '_blank');
    }
}

/**
 * Load the next file in the list
 */
function loadNext() {
    if (currentFileIndex < files.length - 1) {
        currentFileIndex++;
        loadFile(files[currentFileIndex]);
    }
}

/**
 * Load the previous file in the list
 */
function loadPrevious() {
    if (currentFileIndex > 0) {
        currentFileIndex--;
        loadFile(files[currentFileIndex]);
    }
}

/**
 * Save changes to the current file
 */
async function saveChanges() {
    if (!files[currentFileIndex] || !currentData) {
        showAlert('No file loaded', 'error');
        return;
    }
    
    try {
        const response = await fetch('/corrections/api/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                filename: files[currentFileIndex],
                content: currentData,
                original_content: originalData
            }),
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Save failed');
        }
        
        showAlert('Changes saved successfully', 'success');
        
        // Update the files list
        files.splice(currentFileIndex, 1);
        
        if (files.length === 0) {
            // No more files
            currentData = null;
            currentFileIndex = 0;
            displayData();
            updateFileInfo();
        } else {
            // Adjust current index if needed
            if (currentFileIndex >= files.length) {
                currentFileIndex = files.length - 1;
            }
            
            // Load the next file
            loadFile(files[currentFileIndex]);
        }
    } catch (error) {
        console.error('Save error:', error);
        showAlert(`Error saving changes: ${error.message}`, 'error');
    }
}

/**
 * Show an alert message that automatically disappears
 * @param {string} message - The message to display
 * @param {string} type - Alert type ('success', 'error', 'info', 'warning')
 * @param {number} duration - Duration in milliseconds
 */
function showAlert(message, type = 'success', duration = 3000) {
    // Create the alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    
    // Add the message
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Add to the document
    document.body.appendChild(alertDiv);
    
    // Remove after the specified duration
    setTimeout(() => {
        alertDiv.classList.remove('show');
        setTimeout(() => {
            alertDiv.remove();
        }, 300);
    }, duration);
}

/**
 * Fetch and log debug paths
 */
async function debugPaths() {
    try {
        const response = await fetch('/debug-paths');
        const data = await response.json();
        console.log('Debug paths:', data);
    } catch (error) {
        console.error('Error fetching debug paths:', error);
    }
}
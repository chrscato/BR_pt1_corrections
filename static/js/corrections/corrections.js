/**
 * Combined JavaScript functionality for the OCR Corrections tool
 */

// Global variables
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
        
        // Update file info with remaining files count
        updateFileInfo();
        
        // Display the data in the UI
        displayData();
        
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
 * Display the current data in the editor interface
 */
function displayData() {
    const content = document.getElementById('content');
    content.innerHTML = '';

    if (!currentData) {
        content.innerHTML = '<div class="alert alert-info">No data to display</div>';
        return;
    }

    // Header Section with Patient Name
    content.innerHTML += `
        <div class="card mb-4">
            <div class="card-header">
                <h5 class="mb-0">Header Information</h5>
            </div>
            <div class="card-body">
                <img id="header-image" class="region-image mb-4" alt="Header region">
                <div>
                    <label class="form-label">Patient Name</label>
                    <input type="text" value="${currentData.patient_info.patient_name || ''}" 
                           onchange="updateField('patient_info.patient_name', this.value)"
                           class="form-control mb-3">
                </div>
                <div class="row">
                    <div class="col-md-6">
                        <label class="form-label">Date of Birth</label>
                        <input type="text" value="${currentData.patient_info.patient_dob || ''}" 
                               onchange="updateField('patient_info.patient_dob', this.value)"
                               class="form-control mb-3">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Patient Zip</label>
                        <input type="text" value="${currentData.patient_info.patient_zip || ''}"
                               onchange="updateField('patient_info.patient_zip', this.value)"
                               class="form-control mb-3">
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Load header region after a short delay to ensure the element exists
    setTimeout(() => loadPDFRegion('header'), 100);

    // Line Items Section with Image
    if (currentData.service_lines) {
        content.innerHTML += `
            <div class="card mb-4">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">Service Lines</h5>
                    <button onclick="addLineItem()" 
                            class="btn btn-sm btn-success">
                        + Add Line Item
                    </button>
                </div>
                <div class="card-body">
                    <img id="service_lines-image" class="region-image mb-4" alt="Service lines region">
                    <div id="lineItems" class="service-lines-container">
                        ${currentData.service_lines.map((item, index) => `
                            <div class="card mb-3 service-line-card">
                                <div class="card-header d-flex justify-content-between align-items-center py-2">
                                    <h6 class="mb-0">Line Item ${index + 1}</h6>
                                    <button onclick="removeLineItem(${index})" 
                                            class="btn btn-sm btn-danger">
                                        Remove
                                    </button>
                                </div>
                                <div class="card-body">
                                    <div class="row">
                                        <div class="col-md-4">
                                            <label class="form-label">Date of Service</label>
                                            <input type="text" value="${item.date_of_service || ''}"
                                                onchange="updateLineItem(${index}, 'date_of_service', this.value)"
                                                class="form-control mb-3">
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label">Place of Service</label>
                                            <input type="text" value="${item.place_of_service || ''}"
                                                onchange="updateLineItem(${index}, 'place_of_service', this.value)"
                                                class="form-control mb-3">
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label">CPT Code</label>
                                            <input type="text" value="${item.cpt_code || ''}"
                                                onchange="updateLineItem(${index}, 'cpt_code', this.value)"
                                                class="form-control mb-3">
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label">Modifiers</label>
                                            <input type="text" value="${item.modifiers ? item.modifiers.join(', ') : ''}"
                                                onchange="updateLineItem(${index}, 'modifiers', this.value.split(', ').filter(Boolean))"
                                                class="form-control mb-3">
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label">Diagnosis Pointer</label>
                                            <input type="text" value="${item.diagnosis_pointer || ''}"
                                                onchange="updateLineItem(${index}, 'diagnosis_pointer', this.value)"
                                                class="form-control mb-3">
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label">Charge Amount</label>
                                            <input type="text" value="${item.charge_amount || ''}"
                                                onchange="updateLineItem(${index}, 'charge_amount', this.value)"
                                                class="form-control mb-3">
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label">Units</label>
                                            <input type="text" value="${item.units || ''}"
                                                onchange="updateLineItem(${index}, 'units', this.value)"
                                                class="form-control mb-3">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        // Load service lines region after a short delay
        setTimeout(() => loadPDFRegion('service_lines'), 200);
    }

    // Footer Section with Total Charge and Account No
    content.innerHTML += `
        <div class="card mb-4">
            <div class="card-header">
                <h5 class="mb-0">Billing Information</h5>
            </div>
            <div class="card-body">
                <img id="footer-image" class="region-image mb-4" alt="Footer region">
                <div class="row">
                    <div class="col-md-6">
                        <label class="form-label">Total Charge</label>
                        <input type="text" value="${currentData.billing_info.total_charge || ''}"
                               onchange="updateField('billing_info.total_charge', this.value)"
                               class="form-control mb-3">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Patient Account No</label>
                        <input type="text" value="${currentData.billing_info.patient_account_no || ''}"
                               onchange="updateField('billing_info.patient_account_no', this.value)"
                               class="form-control mb-3">
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Load footer region after a short delay
    setTimeout(() => loadPDFRegion('footer'), 300);
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
 * Add a new empty service line
 */
function addLineItem() {
    if (!currentData.service_lines) {
        currentData.service_lines = [];
    }
    
    currentData.service_lines.push({
        date_of_service: '',
        place_of_service: '',
        cpt_code: '',
        modifiers: [],
        diagnosis_pointer: '',
        charge_amount: '',
        units: '1'
    });
    
    displayData();
}

/**
 * Remove a service line at the specified index
 * @param {number} index - The index of the service line to remove
 */
function removeLineItem(index) {
    if (confirm('Are you sure you want to remove this service line?')) {
        currentData.service_lines.splice(index, 1);
        displayData();
    }
}

/**
 * Update a field in the current data
 * @param {string} field - Dot notation path to the field
 * @param {*} value - New value for the field
 */
function updateField(field, value) {
    const keys = field.split('.');
    let obj = currentData;
    
    for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]]) {
            obj[keys[i]] = {};
        }
        obj = obj[keys[i]];
    }
    
    obj[keys[keys.length - 1]] = value;
}

/**
 * Update a field in a service line
 * @param {number} index - Index of the service line
 * @param {string} field - Field name to update
 * @param {*} value - New value for the field
 */
function updateLineItem(index, field, value) {
    if (currentData.service_lines && currentData.service_lines[index]) {
        // Handle special cases
        if (field === 'units') {
            // Ensure units is numeric
            value = value === '' ? '1' : value;
            if (!isNaN(parseInt(value))) {
                value = parseInt(value);
            }
        } else if (field === 'charge_amount') {
            // Format currency if needed
            if (typeof value === 'string' && !value.startsWith('$') && value !== '') {
                value = '$' + value;
            }
        }
        
        currentData.service_lines[index][field] = value;
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
    
    const remainingFiles = files.length;
    
    // Create a more prominent display with the remaining files count
    info.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <div>
                <strong>File ${currentFileIndex + 1} of ${files.length}:</strong> ${files[currentFileIndex]}
            </div>
            <div class="ms-3">
                <span class="badge bg-primary rounded-pill fs-6">${remainingFiles} remaining</span>
            </div>
        </div>
    `;
    
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
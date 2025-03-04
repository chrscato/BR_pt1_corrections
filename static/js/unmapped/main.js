/**
 * Main JavaScript functionality for the Unmapped Records Review tool.
 * This file initializes the app and ties together different modules.
 */

// Global variables
let currentFileName = null;
let currentData = null;
let patientInfoModified = false;
let serviceLinesModified = false;

document.addEventListener('DOMContentLoaded', function() {
    loadFiles();
    setupEventListeners();
    debugPaths();
});

function setupEventListeners() {
    document.getElementById('searchButton')?.addEventListener('click', performSearch);
    document.getElementById('saveButton')?.addEventListener('click', saveChanges);
    document.getElementById('notFoundButton')?.addEventListener('click', handleNotFound);
    document.getElementById('escalateButton')?.addEventListener('click', showEscalateModal);
    document.getElementById('escalateSubmitButton')?.addEventListener('click', submitEscalation);
}

/**
 * Save changes to the current record
 */
async function saveChanges() {
    try {
        if (!currentFileName || !currentData) {
            throw new Error('No file loaded');
        }
        
        // Get values from inputs
        const orderId = document.getElementById('orderIdInput').value.trim();
        const fileMakerRecord = document.getElementById('filemakerInput').value.trim();
        
        if (!orderId) {
            throw new Error('Order ID is required');
        }
        
        // Update the data
        currentData.order_id = orderId;
        currentData.filemaker_record_number = fileMakerRecord;
        
        // Track changes
        const changes = [];
        changes.push(`Order ID set to ${orderId}`);
        if (fileMakerRecord) {
            changes.push(`FileMaker record number set to ${fileMakerRecord}`);
        }
        
        // Check if patient info or service lines were modified
        if (patientInfoModified) {
            changes.push(`Patient information was modified`);
        }
        
        if (serviceLinesModified) {
            changes.push(`Service lines were modified`);
        }
        
        // Show saving indicator
        document.getElementById('saveButton').disabled = true;
        document.getElementById('saveButton').textContent = 'Saving...';
        document.getElementById('notFoundButton').disabled = true;
        document.getElementById('escalateButton').disabled = true;
        
        // Send the updated data to the server
        const response = await fetch('/unmapped/api/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                filename: currentFileName,
                content: currentData,
                changes_made: changes
            }),
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Save failed');
        }
        
        // Reset modification flags
        patientInfoModified = false;
        serviceLinesModified = false;
        
        // Show success message using the new showAlert function
        showAlert('Changes saved successfully!', 'success');
        
        // Reload the file list
        loadFiles();
        
        // Clear the current file
        currentFileName = null;
        currentData = null;
        
        // Reset the UI
        document.getElementById('recordDetails').innerHTML = '<div class="alert alert-info">Select a file to review</div>';
        document.getElementById('pdfFrame').src = 'about:blank';
        document.getElementById('headerImage').src = '';
        document.getElementById('serviceImage').src = '';
        document.getElementById('orderIdInput').value = '';
        document.getElementById('filemakerInput').value = '';
        document.getElementById('saveButton').disabled = true;
        document.getElementById('saveButton').textContent = 'Save Changes';
        document.getElementById('notFoundButton').disabled = true;
        document.getElementById('escalateButton').disabled = true;
        
    } catch (error) {
        console.error('Save error:', error);
        showAlert(`Error saving changes: ${error.message}`, 'error');
        document.getElementById('saveButton').disabled = false;
        document.getElementById('saveButton').textContent = 'Save Changes';
        document.getElementById('notFoundButton').disabled = false;
        document.getElementById('escalateButton').disabled = false;
    }
}


/**
 * Handle the "Not Found in FileMaker" action
 * Moves the file to the review2 folder without requiring Order ID
 */
async function handleNotFound() {
    try {
        if (!currentFileName || !currentData) {
            showAlert('No file loaded', 'error');
            return;
        }
        
        // Show processing indicator
        document.getElementById('notFoundButton').disabled = true;
        document.getElementById('notFoundButton').innerHTML = 'Processing...';
        document.getElementById('saveButton').disabled = true;
        document.getElementById('escalateButton').disabled = true;
        
        // Send the request to move the file to review2 folder
        const response = await fetch('/unmapped/api/not_found', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                filename: currentFileName,
                content: currentData
            }),
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Operation failed');
        }
        
        // Show success message
        showAlert('File marked as Not Found and moved to review2 folder', 'success');
        
        // Reload the file list
        loadFiles();
        
        // Clear the current file
        currentFileName = null;
        currentData = null;
        
        // Reset the UI
        document.getElementById('recordDetails').innerHTML = '<div class="alert alert-info">Select a file to review</div>';
        document.getElementById('pdfFrame').src = 'about:blank';
        document.getElementById('headerImage').src = '';
        document.getElementById('serviceImage').src = '';
        document.getElementById('orderIdInput').value = '';
        document.getElementById('filemakerInput').value = '';
        document.getElementById('saveButton').disabled = true;
        document.getElementById('notFoundButton').disabled = true;
        document.getElementById('notFoundButton').innerHTML = 'NOT FOUND IN FILEMAKER';
        document.getElementById('escalateButton').disabled = true;
        
    } catch (error) {
        console.error('Not Found operation error:', error);
        showAlert(`Error: ${error.message}`, 'error');
        document.getElementById('notFoundButton').disabled = false;
        document.getElementById('notFoundButton').innerHTML = 'NOT FOUND IN FILEMAKER';
        document.getElementById('saveButton').disabled = false;
        document.getElementById('escalateButton').disabled = false;
    }
}


async function loadFiles() {
    try {
        const response = await fetch('/unmapped/api/files');
        const data = await response.json();
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';

        if (data.files?.length > 0) {
            data.files.forEach(file => {
                const listItem = document.createElement('a');
                listItem.className = 'list-group-item list-group-item-action';
                listItem.textContent = file;
                listItem.href = '#';
                listItem.onclick = (e) => {
                    e.preventDefault();
                    loadFile(file);
                };
                fileList.appendChild(listItem);
            });
        } else {
            fileList.innerHTML = '<div class="list-group-item">No unmapped files found</div>';
        }
    } catch (error) {
        console.error('Error loading files:', error);
        document.getElementById('fileList').innerHTML = '<div class="list-group-item text-danger">Error loading files</div>';
    }
}

async function loadFile(filename) {
    try {
        document.getElementById('recordDetails').innerHTML = '<div class="alert alert-info">Loading file data...</div>';

        const response = await fetch(`/unmapped/api/file/${filename}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to load file');

        currentFileName = filename;
        currentData = result.data;  // ✅ Ensure currentData is assigned

        displayRecordDetails();  // ✅ Call the function to populate UI
        loadPDF(filename);  // ✅ Ensure PDF loads too

        document.getElementById('saveButton').disabled = false;
        document.getElementById('notFoundButton').disabled = false;
        document.getElementById('escalateButton').disabled = false;

    } catch (error) {
        console.error('Error loading file:', error);
        document.getElementById('recordDetails').innerHTML = `<div class="alert alert-danger">Error loading file: ${error.message}</div>`;
    }
}

/**
 * Display the record details in the UI
 */
function displayRecordDetails() {
    if (!currentData) return;
    
    const recordDetails = document.getElementById('recordDetails');
    const patientInfo = currentData.patient_info || {};
    const serviceLines = currentData.service_lines || [];
    
    let html = `
        <div class="card mb-3">
            <div class="card-header d-flex justify-content-between align-items-center">
                <span>Patient Information</span>
                <button class="btn btn-sm btn-outline-primary" onclick="editPatientInfo()">Edit</button>
            </div>
            <div class="card-body">
                <p><strong>Name:</strong> ${patientInfo.patient_name || 'N/A'}</p>
                <p><strong>DOB:</strong> ${patientInfo.patient_dob || 'N/A'}</p>
                <p><strong>Zip:</strong> ${patientInfo.patient_zip || 'N/A'}</p>
            </div>
        </div>
    `;
    
    // Service Lines
    html += `
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <span>Service Lines</span>
                <button class="btn btn-sm btn-outline-primary" onclick="editServiceLines()">Edit</button>
            </div>
            <div class="card-body p-0">
                <table class="table table-sm table-hover m-0">
                    <thead>
                        <tr>
                            <th>DOS</th>
                            <th>CPT</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    if (serviceLines.length > 0) {
        serviceLines.forEach(line => {
            html += `
                <tr>
                    <td>${line.date_of_service || 'N/A'}</td>
                    <td>${line.cpt_code || 'N/A'}</td>
                    <td>${line.charge_amount || 'N/A'}</td>
                </tr>
            `;
        });
    } else {
        html += `<tr><td colspan="3" class="text-center">No service lines found</td></tr>`;
    }
    
    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    recordDetails.innerHTML = html;
    
    // Populate the Order ID and FileMaker input fields
    document.getElementById('orderIdInput').value = currentData.order_id || '';
    document.getElementById('filemakerInput').value = currentData.filemaker_record_number || '';
    
    // Reset modification state for save button
    const saveButton = document.getElementById('saveButton');
    if (saveButton) {
        if (patientInfoModified || serviceLinesModified) {
            saveButton.classList.add('data-modified');
            saveButton.textContent = `Save Changes (Modified)`;
        } else {
            saveButton.classList.remove('data-modified');
            saveButton.textContent = `Save Changes`;
        }
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

// Make sure showAlert is available globally
window.showAlert = showAlert;
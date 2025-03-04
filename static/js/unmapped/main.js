/**
 * Main JavaScript functionality for the Unmapped Records Review tool.
 * This file initializes the app and ties together different modules.
 */

// Global variables
let currentFileName = null;
let currentData = null;
window.patientInfoModified = false;
window.serviceLinesModified = false;

document.addEventListener('DOMContentLoaded', function() {
    console.log("Initializing Unmapped Records Tool");
    loadFiles();
    setupEventListeners();
    debugPaths();
});

function setupEventListeners() {
    console.log("Setting up event listeners");
    const searchButton = document.getElementById('searchButton');
    if (searchButton) {
        searchButton.addEventListener('click', function() {
            if (typeof window.performSearch === 'function') {
                window.performSearch();
            } else {
                console.error("performSearch function is not defined in the global scope");
            }
        });
    } else {
        console.warn("Search button not found in the DOM");
    }
    
    const saveButton = document.getElementById('saveButton');
    if (saveButton) {
        saveButton.addEventListener('click', saveChanges);
    } else {
        console.warn("Save button not found in the DOM");
    }
    
    const notFoundButton = document.getElementById('notFoundButton');
    if (notFoundButton) {
        notFoundButton.addEventListener('click', handleNotFound);
    } else {
        console.warn("Not Found button not found in the DOM");
    }
    
    const escalateButton = document.getElementById('escalateButton');
    if (escalateButton) {
        escalateButton.addEventListener('click', showEscalateModal);
    } else {
        console.warn("Escalate button not found in the DOM");
    }
    
    const escalateSubmitButton = document.getElementById('escalateSubmitButton');
    if (escalateSubmitButton) {
        escalateSubmitButton.addEventListener('click', submitEscalation);
    } else {
        console.warn("Escalate submit button not found in the DOM");
    }
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
        if (window.patientInfoModified) {
            changes.push(`Patient information was modified`);
        }
        
        if (window.serviceLinesModified) {
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
        window.patientInfoModified = false;
        window.serviceLinesModified = false;
        
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
        console.log("Fetching unmapped files list");
        const response = await fetch('/unmapped/api/files');
        const data = await response.json();
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';

        console.log("Files response:", data);

        if (data.files && data.files.length > 0) {
            console.log(`Found ${data.files.length} unmapped files`);
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
            console.log("No unmapped files found");
            fileList.innerHTML = '<div class="list-group-item">No unmapped files found</div>';
            
            // Add a helpful message about checking file paths
            const pathInfoItem = document.createElement('div');
            pathInfoItem.className = 'list-group-item';
            pathInfoItem.innerHTML = `
                <div class="alert alert-info mb-0">
                    <p class="mb-2"><strong>No files found</strong></p>
                    <p>Check that your configuration has the correct paths:</p>
                    <code>config.FOLDERS['UNMAPPED_FOLDER']</code>
                    <p class="mt-2">See debug path information in browser console.</p>
                </div>
            `;
            fileList.appendChild(pathInfoItem);
        }
    } catch (error) {
        console.error('Error loading files:', error);
        document.getElementById('fileList').innerHTML = `
            <div class="list-group-item text-danger">Error loading files: ${error.message}</div>
            <div class="list-group-item">
                <small>Path: /unmapped/api/files</small><br>
                <small>Check the server logs for more information.</small>
            </div>
        `;
    }
}

async function loadFile(filename) {
    try {
        document.getElementById('recordDetails').innerHTML = '<div class="alert alert-info">Loading file data...</div>';

        const response = await fetch(`/unmapped/api/file/${filename}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to load file');

        currentFileName = filename;
        currentData = result.data;

        // Update selected file in the list
        const fileItems = document.querySelectorAll('#fileList a');
        fileItems.forEach(item => {
            if (item.textContent === filename) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        displayRecordDetails();
        loadPDF(filename);
        
        // Pre-populate search fields with patient info from the file
        if (typeof window.prepopulateSearch === 'function') {
            window.prepopulateSearch(filename);
        } else {
            console.error("prepopulateSearch function is not defined in the global scope");
        }

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
                <p><strong>Name:</strong> ${patientInfo.patient_name || ''}</p>
                <p><strong>DOB:</strong> ${patientInfo.patient_dob || ''}</p>
                <p><strong>Zip:</strong> ${patientInfo.patient_zip || ''}</p>
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
                            <th>Modifiers</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    if (serviceLines.length > 0) {
        serviceLines.forEach(line => {
            // Format modifiers for display
            let modifiersDisplay = '';
            if (line.modifiers) {
                if (Array.isArray(line.modifiers) && line.modifiers.length > 0) {
                    modifiersDisplay = line.modifiers.join(', ');
                } else if (typeof line.modifiers === 'string' && line.modifiers.length > 0) {
                    modifiersDisplay = line.modifiers;
                }
            }
            
            html += `
                <tr>
                    <td>${line.date_of_service || ''}</td>
                    <td>${line.cpt_code || ''}</td>
                    <td>${modifiersDisplay}</td>
                    <td>${line.charge_amount || ''}</td>
                </tr>
            `;
        });
    } else {
        html += `<tr><td colspan="4" class="text-center">No service lines found</td></tr>`;
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
        if (window.patientInfoModified || window.serviceLinesModified) {
            saveButton.classList.add('data-modified');
            saveButton.textContent = `Save Changes (Modified)`;
        } else {
            saveButton.classList.remove('data-modified');
            saveButton.textContent = `Save Changes`;
        }
    }
}

/**
 * Show the escalation modal
 */
function showEscalateModal() {
    if (!currentFileName || !currentData) {
        showAlert('No file loaded', 'error');
        return;
    }
    
    // Clear previous notes
    document.getElementById('escalationNote').value = '';
    
    // Show the modal
    const escalateModal = new bootstrap.Modal(document.getElementById('escalateModal'));
    escalateModal.show();
}

/**
 * Submit an escalation
 */
async function submitEscalation() {
    try {
        if (!currentFileName || !currentData) {
            throw new Error('No file loaded');
        }
        
        // Get the escalation notes
        const notes = document.getElementById('escalationNote').value.trim();
        if (!notes) {
            throw new Error('Please provide notes for the escalation');
        }
        
        // Show processing state
        const escalateSubmitButton = document.getElementById('escalateSubmitButton');
        escalateSubmitButton.disabled = true;
        escalateSubmitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
        
        // Send the escalation request
        const response = await fetch('/unmapped/api/escalate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                filename: currentFileName,
                content: currentData,
                notes: notes
            }),
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Escalation failed');
        }
        
        // Hide the modal
        const escalateModal = bootstrap.Modal.getInstance(document.getElementById('escalateModal'));
        if (escalateModal) {
            escalateModal.hide();
        }
        
        // Show success message
        showAlert('File escalated successfully', 'success');
        
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
        document.getElementById('escalateButton').disabled = true;
        
    } catch (error) {
        console.error('Escalation error:', error);
        showAlert(`Error escalating file: ${error.message}`, 'error');
        
        // Reset button state
        const escalateSubmitButton = document.getElementById('escalateSubmitButton');
        escalateSubmitButton.disabled = false;
        escalateSubmitButton.textContent = 'Submit Escalation';
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
 * Debug paths to help troubleshoot
 */
async function debugPaths() {
    try {
        console.log('Fetching debug paths...');
        const response = await fetch('/debug-paths');
        
        if (!response.ok) {
            console.error(`Debug paths failed: ${response.status} ${response.statusText}`);
            return;
        }
        
        const data = await response.json();
        console.log('Debug paths data:', data);
        
        // Specifically log unmapped folder information
        if (data.folder_paths && data.folder_paths.UNMAPPED_FOLDER) {
            console.log('Unmapped folder path:', data.folder_paths.UNMAPPED_FOLDER);
            console.log('Unmapped folder exists:', data.folder_paths.UNMAPPED_FOLDER_exists);
            
            if (data.file_counts && data.file_counts.UNMAPPED_FOLDER !== undefined) {
                console.log('Unmapped file count:', data.file_counts.UNMAPPED_FOLDER);
            }
        }
    } catch (error) {
        console.error('Error fetching debug paths:', error);
    }
}

// Make sure functions are globally available
window.showAlert = showAlert;
window.showEscalateModal = showEscalateModal;
window.submitEscalation = submitEscalation;
window.displayRecordDetails = displayRecordDetails;
window.loadPDF = loadPDF || function() { console.error("loadPDF function is not defined"); };
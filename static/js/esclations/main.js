/**
 * Main JavaScript functionality for the Escalations Dashboard
 */

// Global variables
let currentFileName = null;
let currentData = null;
let currentAction = null;

document.addEventListener('DOMContentLoaded', function() {
    loadFiles();
    setupEventListeners();
    debugPaths();
});

/**
 * Set up event listeners for the UI elements
 */
function setupEventListeners() {
    // Search button
    const searchButton = document.getElementById('searchButton');
    if (searchButton) {
        searchButton.addEventListener('click', function() {
            performSearch();
        });
    }

    // Resolve button
    const resolveButton = document.getElementById('resolveButton');
    if (resolveButton) {
        resolveButton.addEventListener('click', function() {
            showConfirmation('resolve');
        });
    }
    
    // Reject button
    const rejectButton = document.getElementById('rejectButton');
    if (rejectButton) {
        rejectButton.addEventListener('click', function() {
            showConfirmation('reject');
        });
    }
    
    // Confirm action button in modal
    const confirmActionButton = document.getElementById('confirmActionButton');
    if (confirmActionButton) {
        confirmActionButton.addEventListener('click', function() {
            if (currentAction === 'resolve') {
                resolveEscalation();
            } else if (currentAction === 'reject') {
                rejectEscalation();
            }
        });
    }
}

/**
 * Show confirmation modal before performing action
 * @param {string} action - Action to confirm ('resolve' or 'reject')
 */
function showConfirmation(action) {
    if (!currentFileName || !currentData) {
        showAlert('No file loaded', 'error');
        return;
    }
    
    currentAction = action;
    
    const modal = new bootstrap.Modal(document.getElementById('confirmationModal'));
    const modalTitle = document.getElementById('confirmationModalLabel');
    const modalBody = document.getElementById('confirmationModalBody');
    const confirmButton = document.getElementById('confirmActionButton');
    
    if (action === 'resolve') {
        const orderId = document.getElementById('orderIdInput').value.trim();
        if (!orderId) {
            showAlert('Order ID is required to resolve an escalation', 'warning');
            return;
        }
        
        modalTitle.textContent = 'Confirm Resolution';
        modalBody.innerHTML = `
            <p>Are you sure you want to resolve this escalation with the following information?</p>
            <ul>
                <li><strong>Order ID:</strong> ${orderId}</li>
                <li><strong>FileMaker Number:</strong> ${document.getElementById('filemakerInput').value.trim() || 'Not provided'}</li>
                <li><strong>Resolution Notes:</strong> ${document.getElementById('resolutionNotes').value.trim() || 'Not provided'}</li>
            </ul>
            <p>The record will be moved to the mapped folder.</p>
        `;
        confirmButton.textContent = 'Resolve';
        confirmButton.className = 'btn btn-success';
    } else if (action === 'reject') {
        const rejectionReason = document.getElementById('rejectionReason').value.trim();
        if (!rejectionReason) {
            showAlert('Rejection reason is required', 'warning');
            return;
        }
        
        modalTitle.textContent = 'Confirm Rejection';
        modalBody.innerHTML = `
            <p>Are you sure you want to reject this escalation?</p>
            <p><strong>Reason:</strong> ${rejectionReason}</p>
            <p>The record will be moved to the rejected folder.</p>
        `;
        confirmButton.textContent = 'Reject';
        confirmButton.className = 'btn btn-danger';
    }
    
    modal.show();
}

/**
 * Load the list of escalated files
 */
async function loadFiles() {
    try {
        const response = await fetch('/escalations/api/files');
        const data = await response.json();
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';
        
        // Update file count badge
        const fileCount = document.getElementById('fileCount');
        if (fileCount) {
            fileCount.textContent = data.files ? data.files.length : '0';
        }

        if (data.files && data.files.length > 0) {
            data.files.forEach(file => {
                const listItem = document.createElement('a');
                listItem.className = 'list-group-item list-group-item-action list-group-item-escalated';
                listItem.textContent = file;
                listItem.href = '#';
                listItem.onclick = (e) => {
                    e.preventDefault();
                    loadFile(file);
                };
                fileList.appendChild(listItem);
            });
        } else {
            fileList.innerHTML = '<div class="list-group-item">No escalated files found</div>';
        }
    } catch (error) {
        console.error('Error loading files:', error);
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '<div class="list-group-item text-danger">Error loading files</div>';
    }
}

/**
 * Load a specific escalated file and display its content
 * @param {string} filename - Name of the file to load
 */
async function loadFile(filename) {
    try {
        // Update UI to show loading state
        document.getElementById('escalationInfo').innerHTML = '<div class="alert alert-info">Loading escalation details...</div>';
        document.getElementById('recordDetails').innerHTML = '<div class="alert alert-info">Loading record details...</div>';
        
        // Clear any previous search results
        document.getElementById('matchResults').innerHTML = '';
        document.getElementById('matchCount').textContent = '0';
        
        // Fetch the file data
        const response = await fetch(`/escalations/api/file/${filename}`);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Failed to load file');
        }
        
        // Store current data
        currentFileName = filename;
        currentData = result.data;
        
        // Show the resolution form
        document.getElementById('resolutionForm').classList.remove('d-none');
        
        // Display escalation info
        displayEscalationInfo();
        
        // Display record details
        displayRecordDetails();
        
        // Load the PDF
        loadPDF(filename);
        
        // Pre-populate the search form
        prepopulateSearch(filename);
        
        // Highlight the selected file in the list
        const fileItems = document.querySelectorAll('#fileList a');
        fileItems.forEach(item => {
            if (item.textContent === filename) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    } catch (error) {
        console.error('Error loading file:', error);
        document.getElementById('escalationInfo').innerHTML = 
            `<div class="alert alert-danger">Error loading file: ${error.message}</div>`;
    }
}

/**
 * Display the escalation info in the UI
 */
function displayEscalationInfo() {
    if (!currentData || !currentData.escalation) {
        document.getElementById('escalationInfo').innerHTML = '<div class="alert alert-warning">No escalation information found</div>';
        return;
    }
    
    const escalation = currentData.escalation;
    
    // Format the timestamp if it exists
    let formattedDate = 'Unknown date';
    if (escalation.timestamp) {
        try {
            const date = new Date(escalation.timestamp);
            formattedDate = date.toLocaleString();
        } catch (e) {
            console.error('Error formatting date:', e);
        }
    }
    
    // Create the escalation info display
    const html = `
        <div class="escalation-info">
            <div class="d-flex justify-content-between">
                <h5 class="mb-1">Escalation Details</h5>
                <span class="escalation-date">${formattedDate}</span>
            </div>
            <p class="mb-1"><strong>Escalated by:</strong> ${escalation.user || 'Unknown'}</p>
            <div class="escalation-notes">
                <strong>Notes:</strong>
                <p class="mb-0">${escalation.notes || 'No notes provided'}</p>
            </div>
        </div>
    `;
    
    document.getElementById('escalationInfo').innerHTML = html;
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
            <div class="card-header">Patient Information</div>
            <div class="card-body">
                <p class="mb-1"><strong>Name:</strong> ${patientInfo.patient_name || 'N/A'}</p>
                <p class="mb-1"><strong>DOB:</strong> ${patientInfo.patient_dob || 'N/A'}</p>
                <p class="mb-1"><strong>Zip:</strong> ${patientInfo.patient_zip || 'N/A'}</p>
            </div>
        </div>
    `;
    
    // Service Lines
    html += `
        <div class="card">
            <div class="card-header">Service Lines</div>
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
    
    // Clear form fields
    document.getElementById('orderIdInput').value = '';
    document.getElementById('filemakerInput').value = '';
    document.getElementById('resolutionNotes').value = '';
    document.getElementById('rejectionReason').value = '';
}

/**
 * Load the PDF into the viewer
 * @param {string} filename - Name of the file to load
 */
function loadPDF(filename) {
    // Load the full PDF
    const pdfFrame = document.getElementById('pdfFrame');
    pdfFrame.src = `/escalations/api/pdf/${filename}`;
    
    // Load the header region
    loadPDFRegion(filename, 'header', 'headerImage');
    
    // Load the service lines region
    loadPDFRegion(filename, 'service_lines', 'serviceImage');
}

/**
 * Load a specific region of a PDF
 * @param {string} filename - Name of the file to load
 * @param {string} region - Region name (header, service_lines, footer)
 * @param {string} imgId - ID of the image element to update
 */
async function loadPDFRegion(filename, region, imgId) {
    try {
        const response = await fetch(`/escalations/api/pdf_region/${filename}/${region}`);
        const data = await response.json();
        
        if (data.image) {
            const imgElement = document.getElementById(imgId);
            if (imgElement) {
                imgElement.src = data.image;
            }
        }
    } catch (error) {
        console.error(`Error loading ${region} PDF region:`, error);
    }
}

/**
 * Pre-populate the search form with data from the file
 * @param {string} filename - Name of the file to load
 */
async function prepopulateSearch(filename) {
    try {
        const response = await fetch(`/escalations/api/extract_patient_info/${filename}`);
        const data = await response.json();
        
        if (response.ok) {
            document.getElementById('firstNameSearch').value = data.first_name || '';
            document.getElementById('lastNameSearch').value = data.last_name || '';
            document.getElementById('dosSearch').value = data.dos || '';
            
            // Auto-search if we have data
            if ((data.first_name || data.last_name) && data.dos) {
                performSearch();
            }
        }
    } catch (error) {
        console.error('Error pre-populating search:', error);
    }
}

/**
 * Perform a database search using the form data
 */
async function performSearch() {
    try {
        const firstName = document.getElementById('firstNameSearch').value;
        const lastName = document.getElementById('lastNameSearch').value;
        const dosDate = document.getElementById('dosSearch').value;
        const monthsRange = document.getElementById('monthsRange').value;
        
        if (!firstName && !lastName) {
            document.getElementById('searchStatus').innerHTML = 
                '<div class="alert alert-warning">Please enter at least a first or last name</div>';
            return;
        }
        
        // Show loading indicator
        document.getElementById('searchStatus').innerHTML = 
            '<div class="alert alert-info">Searching...</div>';
        
        const response = await fetch('/escalations/api/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                first_name: firstName,
                last_name: lastName,
                dos_date: dosDate,
                months_range: monthsRange
            }),
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Search failed');
        }
        
        displaySearchResults(result.results);
    } catch (error) {
        console.error('Search error:', error);
        document.getElementById('searchStatus').innerHTML = 
            `<div class="alert alert-danger">Search error: ${error.message}</div>`;
    }
}

/**
 * Display search results in the UI
 * @param {Array} results - Search results to display
 */
function displaySearchResults(results) {
    const matchResults = document.getElementById('matchResults');
    const matchCount = document.getElementById('matchCount');
    const searchStatus = document.getElementById('searchStatus');
    
    if (!results || results.length === 0) {
        matchResults.innerHTML = '';
        matchCount.textContent = '0';
        searchStatus.innerHTML = '<div class="alert alert-warning">No matches found</div>';
        return;
    }
    
    // Update match count
    matchCount.textContent = results.length.toString();
    searchStatus.innerHTML = '';
    
    // Display results
    let html = '';
    results.forEach(result => {
        const matchScore = result.match_score ? Math.round(result.match_score) : 'N/A';
        const daysFromTarget = result.days_from_target !== undefined ? result.days_from_target : 'N/A';
        
        html += `
            <div class="card mb-2">
                <div class="card-header p-2">
                    <div class="d-flex justify-content-between align-items-center">
                        <strong>${result.Patient_Last_Name}, ${result.Patient_First_Name}</strong>
                        <button class="btn btn-sm btn-success" 
                                onclick="applyMatch('${result.Order_ID}', '${result.FileMaker_Record_Number}')">
                            Apply
                        </button>
                    </div>
                </div>
                <div class="card-body p-2">
                    <p class="mb-1"><small>Order ID: ${result.Order_ID}</small></p>
                    <p class="mb-1"><small>FileMaker: ${result.FileMaker_Record_Number}</small></p>
                    <p class="mb-1"><small>DOS: ${result.DOS_List || 'N/A'}</small></p>
                    <p class="mb-1"><small>CPT: ${result.CPT_List || 'N/A'}</small></p>
                    <div class="d-flex justify-content-between">
                        <span class="badge bg-primary">Match: ${matchScore}%</span>
                        <span class="badge bg-info">Days: ${daysFromTarget}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    matchResults.innerHTML = html;
}

/**
 * Apply a match from the search results
 * @param {string} orderId - Order ID to apply
 * @param {string} fileMakerRecord - FileMaker record number to apply
 */
function applyMatch(orderId, fileMakerRecord) {
    document.getElementById('orderIdInput').value = orderId;
    document.getElementById('filemakerInput').value = fileMakerRecord;
    
    // Highlight the inputs to show they've been updated
    document.getElementById('orderIdInput').classList.add('border-success');
    document.getElementById('filemakerInput').classList.add('border-success');
    
    // Scroll to the resolution form
    document.getElementById('resolutionForm').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Resolve the current escalation
 */
async function resolveEscalation() {
    try {
        if (!currentFileName || !currentData) {
            throw new Error('No file loaded');
        }
        
        // Get values from inputs
        const orderId = document.getElementById('orderIdInput').value.trim();
        const filemakerNumber = document.getElementById('filemakerInput').value.trim();
        const resolutionNotes = document.getElementById('resolutionNotes').value.trim();
        
        if (!orderId) {
            throw new Error('Order ID is required');
        }
        
        // Close the modal if it's open
        const modal = bootstrap.Modal.getInstance(document.getElementById('confirmationModal'));
        if (modal) {
            modal.hide();
        }
        
        // Show loading state
        const confirmButton = document.getElementById('confirmActionButton');
        confirmButton.disabled = true;
        confirmButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
        
        // Send the request
        const response = await fetch('/escalations/api/resolve', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                filename: currentFileName,
                content: currentData,
                order_id: orderId,
                filemaker_number: filemakerNumber,
                resolution_notes: resolutionNotes
            }),
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Resolution failed');
        }
        
        // Show success message
        showAlert('Escalation resolved successfully', 'success');
        
        // Reload the file list
        loadFiles();
        
        // Clear the current file
        clearCurrentFile();
        
    } catch (error) {
        console.error('Resolution error:', error);
        showAlert(`Error resolving escalation: ${error.message}`, 'error');
        
        // Reset button state
        const confirmButton = document.getElementById('confirmActionButton');
        confirmButton.disabled = false;
        confirmButton.textContent = 'Resolve';
    }
}

/**
 * Reject the current escalation
 */
async function rejectEscalation() {
    try {
        if (!currentFileName || !currentData) {
            throw new Error('No file loaded');
        }
        
        // Get values from inputs
        const rejectionReason = document.getElementById('rejectionReason').value.trim();
        
        if (!rejectionReason) {
            throw new Error('Rejection reason is required');
        }
        
        // Close the modal if it's open
        const modal = bootstrap.Modal.getInstance(document.getElementById('confirmationModal'));
        if (modal) {
            modal.hide();
        }
        
        // Show loading state
        const confirmButton = document.getElementById('confirmActionButton');
        confirmButton.disabled = true;
        confirmButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
        
        // Send the request
        const response = await fetch('/escalations/api/reject', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                filename: currentFileName,
                content: currentData,
                rejection_reason: rejectionReason
            }),
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Rejection failed');
        }
        
        // Show success message
        showAlert('Escalation rejected successfully', 'success');
        
        // Reload the file list
        loadFiles();
        
        // Clear the current file
        clearCurrentFile();
        
    } catch (error) {
        console.error('Rejection error:', error);
        showAlert(`Error rejecting escalation: ${error.message}`, 'error');
        
        // Reset button state
        const confirmButton = document.getElementById('confirmActionButton');
        confirmButton.disabled = false;
        confirmButton.textContent = 'Reject';
    }
}

/**
 * Clear the current file and reset UI
 */
function clearCurrentFile() {
    currentFileName = null;
    currentData = null;
    
    // Reset UI
    document.getElementById('escalationInfo').innerHTML = '<div class="alert alert-info">Select an escalated record to review</div>';
    document.getElementById('recordDetails').innerHTML = '';
    document.getElementById('pdfFrame').src = 'about:blank';
    document.getElementById('headerImage').src = '';
    document.getElementById('serviceImage').src = '';
    document.getElementById('resolutionForm').classList.add('d-none');
    document.getElementById('orderIdInput').value = '';
    document.getElementById('filemakerInput').value = '';
    document.getElementById('resolutionNotes').value = '';
    document.getElementById('rejectionReason').value = '';
    document.getElementById('searchStatus').innerHTML = '';
    document.getElementById('matchResults').innerHTML = '';
    document.getElementById('matchCount').textContent = '0';
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
 * Utility function to debug paths
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
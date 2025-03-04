/**
 * File management functionality for the Escalations Dashboard
 * Handles loading and displaying escalation files
 */

/**
 * Load the list of escalated files
 */
async function loadFiles() {
    try {
        console.log('Attempting to fetch escalated files...');
        const response = await fetch('/escalations/api/files');
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Received data:', data);
        
        // Check for error message from server
        if (data.error) {
            console.error('Server reported error:', data.error);
        }
        
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';
        
        // Update file count badge
        const fileCount = document.getElementById('fileCount');
        if (fileCount) {
            fileCount.textContent = data.files ? data.files.length : '0';
        }

        if (data.files && data.files.length > 0) {
            console.log(`Found ${data.files.length} escalated files`);
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
            console.log('No escalated files found');
            fileList.innerHTML = '<div class="list-group-item">No escalated files found</div>';
            
            // Add information about how to create escalations
            const infoItem = document.createElement('div');
            infoItem.className = 'list-group-item';
            infoItem.innerHTML = `
                <div class="alert alert-info mb-0">
                    <p class="mb-2"><strong>How to create an escalation:</strong></p>
                    <ol class="mb-0">
                        <li>Go to the Unmapped Records tool</li>
                        <li>Select a record</li>
                        <li>Click the "ESCALATE" button</li>
                        <li>Enter notes and submit</li>
                    </ol>
                </div>
            `;
            fileList.appendChild(infoItem);
        }
    } catch (error) {
        console.error('Error loading files:', error);
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = `
            <div class="list-group-item text-danger">Error loading files: ${error.message}</div>
            <div class="list-group-item">
                <small>Path: /escalations/api/files</small><br>
                <small>Check the server logs for more information.</small>
            </div>
        `;
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
        
        console.log(`Loading file: ${filename}`);
        
        // Fetch the file data
        const response = await fetch(`/escalations/api/file/${filename}`);
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('Received file data');
        
        // Check for error message from server
        if (result.error) {
            throw new Error(result.error);
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
        document.getElementById('recordDetails').innerHTML = '';
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
            <div class="card-header d-flex justify-content-between align-items-center">
                <span>Patient Information</span>
                <button class="btn btn-sm btn-outline-primary" onclick="editPatientInfo()">Edit</button>
            </div>
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
                    <tbody id="serviceLinesList">
    `;
    
    if (serviceLines.length > 0) {
        serviceLines.forEach((line, index) => {
            const modifiersDisplay = line.modifiers && Array.isArray(line.modifiers) && line.modifiers.length > 0 
                ? line.modifiers.join(', ') 
                : 'N/A';
                
            html += `
                <tr class="service-line-row" data-index="${index}">
                    <td>${line.date_of_service || 'N/A'}</td>
                    <td>${line.cpt_code || 'N/A'}</td>
                    <td>${modifiersDisplay}</td>
                    <td>${line.charge_amount || 'N/A'}</td>
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
    
    // Clear form fields
    document.getElementById('orderIdInput').value = '';
    document.getElementById('filemakerInput').value = '';
    document.getElementById('resolutionNotes').value = '';
    document.getElementById('rejectionReason').value = '';
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
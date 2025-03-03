/**
 * Main JavaScript functionality for the Unmapped Records Review tool
 */

let currentFileName = null;
let currentData = null;

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

    // Save button
    const saveButton = document.getElementById('saveButton');
    if (saveButton) {
        saveButton.addEventListener('click', function() {
            saveChanges();
        });
    }

    // NOT FOUND button
    const notFoundButton = document.getElementById('notFoundButton');
    if (notFoundButton) {
        notFoundButton.addEventListener('click', async function() {
            const filename = document.getElementById('orderIdInput').value;
            if (!filename) {
                showAlert('Please enter an Order ID before proceeding.', 'warning');
                return;
            }

            try {
                const response = await fetch(`/unmapped/api/not_found`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ filename })
                });

                const result = await response.json();
                if (response.ok) {
                    showAlert('File sent successfully.', 'success');
                } else {
                    showAlert(result.error || 'An error occurred.', 'error');
                }
            } catch (error) {
                showAlert('An error occurred while sending the file.', 'error');
            }
        });
    }
}

/**
 * Load the list of unmapped files
 */
async function loadFiles() {
    try {
        const response = await fetch('/unmapped/api/files');
        const data = await response.json();
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';

        if (data.files && data.files.length > 0) {
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
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '<div class="list-group-item text-danger">Error loading files</div>';
    }
}

/**
 * Load a specific file and display its content
 * @param {string} filename - Name of the file to load
 */
async function loadFile(filename) {
    try {
        // Update UI to show loading state
        document.getElementById('recordDetails').innerHTML = '<div class="alert alert-info">Loading file data...</div>';
        
        // Clear any previous search results
        document.getElementById('matchResults').innerHTML = '';
        document.getElementById('matchCount').textContent = '0';
        
        // Fetch the file data
        const response = await fetch(`/unmapped/api/file/${filename}`);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Failed to load file');
        }
        
        // Store current data
        currentFileName = filename;
        currentData = result.data;
        
        // Update record details display
        displayRecordDetails();
        
        // Load the PDF
        loadPDF(filename);
        
        // Pre-populate the search form
        prepopulateSearch(filename);
        
        // Enable the save button
        document.getElementById('saveButton').disabled = false;
        
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
        document.getElementById('recordDetails').innerHTML = 
            `<div class="alert alert-danger">Error loading file: ${error.message}</div>`;
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
}

/**
 * Load the PDF into the viewer
 * @param {string} filename - Name of the file to load
 */
function loadPDF(filename) {
    // Load the full PDF
    const pdfFrame = document.getElementById('pdfFrame');
    pdfFrame.src = `/unmapped/api/pdf/${filename}`;
    
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
        const response = await fetch(`/unmapped/api/pdf_region/${filename}/${region}`);
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
        const response = await fetch(`/unmapped/api/extract_patient_info/${filename}`);
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
        
        const response = await fetch('/unmapped/api/search', {
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
    
    // Enable the save button
    document.getElementById('saveButton').disabled = false;
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
        
        // Show saving indicator
        document.getElementById('saveButton').disabled = true;
        document.getElementById('saveButton').textContent = 'Saving...';
        
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
        
        // Show success message
        alert('Changes saved successfully!');
        
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
        
    } catch (error) {
        console.error('Save error:', error);
        alert(`Error saving changes: ${error.message}`);
        document.getElementById('saveButton').disabled = false;
        document.getElementById('saveButton').textContent = 'Save Changes';
    }
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

// Placeholder functions for patient and service line editing
// These would be implemented in their respective files
function editPatientInfo() {
    alert('Patient info editing not implemented yet');
}

function editServiceLines() {
    alert('Service line editing not implemented yet');
}
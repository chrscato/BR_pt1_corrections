/**
 * Service line editing functionality for the Unmapped Records Review tool
 */

// Track if the service lines have been modified
let serviceLinesModified = false;

/**
 * Edit service lines in the unmapped records
 */
function editServiceLines() {
    if (!currentData) {
        showAlert('No record loaded', 'error');
        return;
    }

    const serviceLines = currentData.service_lines || [];
    
    // Create an editable service lines table
    const html = `
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <span>Edit Service Lines</span>
                <div>
                    <button class="btn btn-sm btn-success me-2" onclick="addServiceLine()">
                        <i class="bi bi-plus-circle"></i> Add Line
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="saveServiceLines()">
                        <i class="bi bi-check-circle"></i> Done
                    </button>
                </div>
            </div>
            <div class="card-body p-0">
                <table class="table table-sm table-hover m-0" id="serviceLineTable">
                    <thead>
                        <tr>
                            <th>DOS</th>
                            <th>CPT</th>
                            <th>Amount</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    if (serviceLines.length > 0) {
        serviceLines.forEach((line, index) => {
            html += `
                <tr id="service-line-${index}">
                    <td>
                        <input type="text" class="form-control form-control-sm" 
                            value="${line.date_of_service || ''}" 
                            onchange="updateServiceLine(${index}, 'date_of_service', this.value)">
                    </td>
                    <td>
                        <input type="text" class="form-control form-control-sm" 
                            value="${line.cpt_code || ''}" 
                            onchange="updateServiceLine(${index}, 'cpt_code', this.value)">
                    </td>
                    <td>
                        <input type="text" class="form-control form-control-sm" 
                            value="${line.charge_amount || ''}" 
                            onchange="updateServiceLine(${index}, 'charge_amount', this.value)">
                    </td>
                    <td>
                        <button class="btn btn-sm btn-danger" onclick="removeServiceLine(${index})">
                            Remove
                        </button>
                    </td>
                </tr>
            `;
        });
    } else {
        html += `
            <tr>
                <td colspan="4" class="text-center">
                    No service lines found. Click "Add Line" to add one.
                </td>
            </tr>
        `;
    }
    
    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    // Update the record details display
    document.getElementById('recordDetails').innerHTML = html;
}

/**
 * Add a new service line
 */
function addServiceLine() {
    if (!currentData) return;
    
    if (!currentData.service_lines) {
        currentData.service_lines = [];
    }
    
    // Add a new empty service line
    currentData.service_lines.push({
        date_of_service: '',
        cpt_code: '',
        charge_amount: ''
    });
    
    // Mark as modified
    serviceLinesModified = true;
    
    // Update the Service Lines UI
    editServiceLines();
    
    // Mark save button as modified
    const saveButton = document.getElementById('saveButton');
    if (saveButton) {
        saveButton.classList.add('data-modified');
        saveButton.textContent = `Save Changes (Modified)`;
    }
}

/**
 * Remove a service line
 * @param {number} index - Index of the service line to remove
 */
function removeServiceLine(index) {
    if (!currentData || !currentData.service_lines) return;
    
    // Confirm removal
    if (confirm('Are you sure you want to remove this service line?')) {
        // Remove the service line
        currentData.service_lines.splice(index, 1);
        
        // Mark as modified
        serviceLinesModified = true;
        
        // Update the Service Lines UI
        editServiceLines();
        
        // Mark save button as modified
        const saveButton = document.getElementById('saveButton');
        if (saveButton) {
            saveButton.classList.add('data-modified');
            saveButton.textContent = `Save Changes (Modified)`;
        }
    }
}

/**
 * Update a field in a service line
 * @param {number} index - Index of the service line
 * @param {string} field - Field name to update
 * @param {*} value - New value for the field
 */
function updateServiceLine(index, field, value) {
    if (!currentData || !currentData.service_lines || !currentData.service_lines[index]) return;
    
    // Update the field
    currentData.service_lines[index][field] = value;
    
    // Mark as modified
    serviceLinesModified = true;
    
    // Mark save button as modified
    const saveButton = document.getElementById('saveButton');
    if (saveButton) {
        saveButton.classList.add('data-modified');
        saveButton.textContent = `Save Changes (Modified)`;
    }
}

/**
 * Save service lines changes and return to normal view
 */
function saveServiceLines() {
    // Display the normal record details
    displayRecordDetails();
}

/**
 * Edit patient information
 */
function editPatientInfo() {
    if (!currentData) {
        showAlert('No record loaded', 'error');
        return;
    }

    const patientInfo = currentData.patient_info || {};
    
    // Create an editable patient info form
    const html = `
        <div class="card mb-3" id="patientInfoEdit">
            <div class="card-header d-flex justify-content-between align-items-center">
                <span>Edit Patient Information</span>
                <button class="btn btn-sm btn-primary" onclick="savePatientInfo()">
                    <i class="bi bi-check-circle"></i> Done
                </button>
            </div>
            <div class="card-body">
                <div class="mb-3">
                    <label class="form-label">Patient Name</label>
                    <input type="text" class="form-control" id="edit-patient-name" 
                        value="${patientInfo.patient_name || ''}" 
                        onchange="updatePatientInfo('patient_name', this.value)">
                </div>
                <div class="mb-3">
                    <label class="form-label">Date of Birth</label>
                    <input type="text" class="form-control" id="edit-patient-dob" 
                        value="${patientInfo.patient_dob || ''}" 
                        onchange="updatePatientInfo('patient_dob', this.value)">
                </div>
                <div class="mb-3">
                    <label class="form-label">Zip Code</label>
                    <input type="text" class="form-control" id="edit-patient-zip" 
                        value="${patientInfo.patient_zip || ''}" 
                        onchange="updatePatientInfo('patient_zip', this.value)">
                </div>
            </div>
        </div>
    `;
    
    // Replace the patient info section in the record details
    const recordDetails = document.getElementById('recordDetails');
    const recordContent = recordDetails.innerHTML;
    recordDetails.innerHTML = html + recordContent.substring(recordContent.indexOf('<div class="card">'));
}

/**
 * Update a patient info field
 * @param {string} field - Field name to update
 * @param {string} value - New value for the field
 */
function updatePatientInfo(field, value) {
    if (!currentData) return;
    
    // Ensure patient_info exists
    if (!currentData.patient_info) {
        currentData.patient_info = {};
    }
    
    // Update the field
    currentData.patient_info[field] = value;
    
    // Mark save button as modified
    const saveButton = document.getElementById('saveButton');
    if (saveButton) {
        saveButton.classList.add('data-modified');
        saveButton.textContent = `Save Changes (Modified)`;
    }
}

/**
 * Save patient info changes and return to normal view
 */
function savePatientInfo() {
    // Display the normal record details
    displayRecordDetails();
}
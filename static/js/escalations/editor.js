/**
 * Editing functionality for the Escalations Dashboard
 * Handles patient information and service line editing
 */

/**
 * Edit patient information
 */
function editPatientInfo() {
    if (!currentData || !currentData.patient_info) return;
    
    const patientInfo = currentData.patient_info;
    
    // Find the patient info card and replace it with an edit form
    const patientCard = document.querySelector('#recordDetails .card:first-child');
    if (!patientCard) return;
    
    // Create edit form
    const editForm = document.createElement('div');
    editForm.className = 'card mb-3';
    editForm.innerHTML = `
        <div class="card-header d-flex justify-content-between align-items-center">
            <span>Edit Patient Information</span>
            <div>
                <button class="btn btn-sm btn-outline-secondary me-2" onclick="cancelEditPatient()">Cancel</button>
                <button class="btn btn-sm btn-primary" onclick="savePatientInfo()">Save</button>
            </div>
        </div>
        <div class="card-body">
            <div class="mb-3">
                <label class="form-label">Patient Name</label>
                <input type="text" id="editPatientName" class="form-control" value="${patientInfo.patient_name || ''}">
            </div>
            <div class="mb-3">
                <label class="form-label">Date of Birth</label>
                <input type="text" id="editPatientDOB" class="form-control" value="${patientInfo.patient_dob || ''}">
            </div>
            <div class="mb-3">
                <label class="form-label">Zip Code</label>
                <input type="text" id="editPatientZip" class="form-control" value="${patientInfo.patient_zip || ''}">
            </div>
        </div>
    `;
    
    // Replace the patient card with the edit form
    patientCard.replaceWith(editForm);
}

/**
 * Cancel patient information editing
 */
function cancelEditPatient() {
    // Redisplay the record details
    displayRecordDetails();
}

/**
 * Save edited patient information
 */
function savePatientInfo() {
    if (!currentData) return;
    
    // Get values from the form
    const patientName = document.getElementById('editPatientName').value.trim();
    const patientDOB = document.getElementById('editPatientDOB').value.trim();
    const patientZip = document.getElementById('editPatientZip').value.trim();
    
    // Update the current data
    if (!currentData.patient_info) {
        currentData.patient_info = {};
    }
    
    currentData.patient_info.patient_name = patientName;
    currentData.patient_info.patient_dob = patientDOB;
    currentData.patient_info.patient_zip = patientZip;
    
    // Redisplay the record details
    displayRecordDetails();
    
    // Show success message
    showAlert('Patient information updated', 'success');
}

/**
 * Edit service lines
 */
function editServiceLines() {
    if (!currentData) return;
    
    // Find the service lines card and replace it with an edit form
    const serviceCard = document.querySelector('#recordDetails .card:last-child');
    if (!serviceCard) return;
    
    // Create edit form
    const editForm = document.createElement('div');
    editForm.className = 'card';
    editForm.innerHTML = `
        <div class="card-header d-flex justify-content-between align-items-center">
            <span>Edit Service Lines</span>
            <div>
                <button class="btn btn-sm btn-outline-success me-2" onclick="addServiceLine()">Add Line</button>
                <button class="btn btn-sm btn-outline-secondary me-2" onclick="cancelEditServiceLines()">Cancel</button>
                <button class="btn btn-sm btn-primary" onclick="saveServiceLines()">Save</button>
            </div>
        </div>
        <div class="card-body p-0">
            <table class="table table-sm m-0">
                <thead>
                    <tr>
                        <th>DOS</th>
                        <th>CPT</th>
                        <th>Modifiers</th>
                        <th>Amount</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="editServiceLinesList">
                    ${generateServiceLineEditRows()}
                </tbody>
            </table>
        </div>
    `;
    
    // Replace the service lines card with the edit form
    serviceCard.replaceWith(editForm);
}

/**
 * Generate HTML for service line edit rows
 * @returns {string} HTML for service line edit rows
 */
function generateServiceLineEditRows() {
    if (!currentData || !currentData.service_lines || currentData.service_lines.length === 0) {
        return `<tr><td colspan="5" class="text-center">No service lines found. Click "Add Line" to add one.</td></tr>`;
    }
    
    let html = '';
    currentData.service_lines.forEach((line, index) => {
        // Format modifiers for display
        const modifiersValue = line.modifiers && Array.isArray(line.modifiers) 
            ? line.modifiers.join(', ') 
            : (line.modifiers || '');
            
        html += `
            <tr data-index="${index}">
                <td>
                    <input type="text" class="form-control form-control-sm edit-dos" 
                        value="${line.date_of_service || ''}" placeholder="YYYY-MM-DD">
                </td>
                <td>
                    <input type="text" class="form-control form-control-sm edit-cpt" 
                        value="${line.cpt_code || ''}" placeholder="CPT Code">
                </td>
                <td>
                    <input type="text" class="form-control form-control-sm edit-modifiers" 
                        value="${modifiersValue}" placeholder="Comma separated">
                </td>
                <td>
                    <input type="text" class="form-control form-control-sm edit-charge" 
                        value="${line.charge_amount || ''}" placeholder="$0.00">
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-danger" onclick="removeServiceLine(${index})">
                        Remove
                    </button>
                </td>
            </tr>
        `;
    });
    
    return html;
}

/**
 * Cancel service lines editing
 */
function cancelEditServiceLines() {
    // Redisplay the record details
    displayRecordDetails();
}

/**
 * Save edited service lines
 */
function saveServiceLines() {
    if (!currentData) return;
    
    // Get all service line rows
    const rows = document.querySelectorAll('#editServiceLinesList tr[data-index]');
    
    // Create new service lines array
    const serviceLines = [];
    
    rows.forEach(row => {
        const dosInput = row.querySelector('.edit-dos');
        const cptInput = row.querySelector('.edit-cpt');
        const modifiersInput = row.querySelector('.edit-modifiers');
        const chargeInput = row.querySelector('.edit-charge');
        
        if (dosInput && cptInput && modifiersInput && chargeInput) {
            // Parse modifiers - split by comma and trim each modifier
            const modifiersText = modifiersInput.value.trim();
            const modifiers = modifiersText ? 
                modifiersText.split(',').map(m => m.trim()).filter(m => m.length > 0) : 
                [];
                
            serviceLines.push({
                date_of_service: dosInput.value.trim(),
                cpt_code: cptInput.value.trim(),
                modifiers: modifiers,
                charge_amount: chargeInput.value.trim()
            });
        }
    });
    
    // Update the current data
    currentData.service_lines = serviceLines;
    
    // Redisplay the record details
    displayRecordDetails();
    
    // Show success message
    showAlert('Service lines updated', 'success');
}

/**
 * Add a new service line
 */
function addServiceLine() {
    // Initialize service_lines array if it doesn't exist
    if (!currentData.service_lines) {
        currentData.service_lines = [];
    }
    
    // Add a new empty service line
    currentData.service_lines.push({
        date_of_service: '',
        cpt_code: '',
        modifiers: [],
        charge_amount: ''
    });
    
    // Refresh the service lines edit table
    const serviceLinesList = document.getElementById('editServiceLinesList');
    if (serviceLinesList) {
        serviceLinesList.innerHTML = generateServiceLineEditRows();
    }
}

/**
 * Remove a service line
 * @param {number} index - Index of the service line to remove
 */
function removeServiceLine(index) {
    if (!currentData || !currentData.service_lines) return;
    
    // Remove the service line at the specified index
    currentData.service_lines.splice(index, 1);
    
    // Refresh the service lines edit table
    const serviceLinesList = document.getElementById('editServiceLinesList');
    if (serviceLinesList) {
        serviceLinesList.innerHTML = generateServiceLineEditRows();
    }
}
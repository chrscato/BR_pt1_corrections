/**
 * Patient information editing functionality for the Unmapped Records Review tool
 */

// Track if the patient info has been modified
let patientInfoModified = false;

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
    
    // Look for the first card which should be the patient info card
    const firstCardEndIndex = recordContent.indexOf('</div>', recordContent.indexOf('<div class="card'));
    if (firstCardEndIndex > -1) {
        // Find the closing div for the card
        const closingDivIndex = recordContent.indexOf('</div>', firstCardEndIndex + 6);
        if (closingDivIndex > -1) {
            // Replace the first card with our edit form
            recordDetails.innerHTML = html + recordContent.substring(closingDivIndex + 6);
        } else {
            // Fallback - just prepend
            recordDetails.innerHTML = html + recordContent;
        }
    } else {
        // Fallback - just prepend
        recordDetails.innerHTML = html + recordContent;
    }
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
    
    // Mark as modified
    patientInfoModified = true;
    
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
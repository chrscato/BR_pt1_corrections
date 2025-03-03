/**
 * Editor functionality for the OCR Corrections tool
 */

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
    
    // Load header region automatically
    loadPDFRegion('header');

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
        
        // Load service lines region automatically
        loadPDFRegion('service_lines');
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
    
    // Load footer region automatically
    loadPDFRegion('footer');
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
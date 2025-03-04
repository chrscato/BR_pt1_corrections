/**
 * Service line editing functionality for the Unmapped Records Review tool
 */

/**
 * Edit service lines in the unmapped records
 */
function editServiceLines() {
    if (!currentData) {
        showAlert('No record loaded', 'error');
        return;
    }

    // Make a copy of service lines to ensure we're not modifying a const array
    const serviceLines = Array.isArray(currentData.service_lines) ? [...currentData.service_lines] : [];
    
    // Create an editable service lines table
    let html = `
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
                            <th>Modifiers</th>
                            <th>Amount</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    if (serviceLines.length > 0) {
        serviceLines.forEach((line, index) => {
            // Create a copy of each line to avoid modifying the original
            const safeItem = {...line};
            
            // Format modifiers for display - convert array to comma-separated string
            let modifiersValue = '';
            if (safeItem.modifiers) {
                if (Array.isArray(safeItem.modifiers)) {
                    modifiersValue = safeItem.modifiers.join(', ');
                } else if (typeof safeItem.modifiers === 'string') {
                    modifiersValue = safeItem.modifiers;
                }
            }
            
            html += `
                <tr id="service-line-${index}">
                    <td>
                        <input type="text" class="form-control form-control-sm" 
                            value="${safeItem.date_of_service || ''}" 
                            onchange="updateServiceLine(${index}, 'date_of_service', this.value)">
                    </td>
                    <td>
                        <input type="text" class="form-control form-control-sm" 
                            value="${safeItem.cpt_code || ''}" 
                            onchange="updateServiceLine(${index}, 'cpt_code', this.value)">
                    </td>
                    <td>
                        <input type="text" class="form-control form-control-sm" 
                            value="${modifiersValue}" 
                            placeholder="e.g. 25, 59, RT"
                            onchange="updateServiceLineModifiers(${index}, this.value)">
                    </td>
                    <td>
                        <input type="text" class="form-control form-control-sm" 
                            value="${safeItem.charge_amount || ''}" 
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
                <td colspan="5" class="text-center">
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
    const recordDetails = document.getElementById('recordDetails');
    if (!recordDetails) {
        console.error("Record details element not found");
        return;
    }
    
    const recordContent = recordDetails.innerHTML;
    
    // Find the service lines card (second card) and replace it
    const firstCardEnd = recordContent.indexOf('</div>', recordContent.indexOf('<div class="card mb-3"')) + 6;
    if (firstCardEnd > 6) {
        recordDetails.innerHTML = recordContent.substring(0, firstCardEnd) + html;
    } else {
        console.error("Could not find first card end. Using fallback approach");
        // Fallback - just append the service line editor
        recordDetails.innerHTML += html;
    }
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
        modifiers: [],
        charge_amount: ''
    });
    
    // Mark as modified
    window.serviceLinesModified = true;
    
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
        // Make a copy of the service lines array
        const newServiceLines = [...currentData.service_lines];
        // Remove the service line
        newServiceLines.splice(index, 1);
        // Update the data
        currentData.service_lines = newServiceLines;
        
        // Mark as modified
        window.serviceLinesModified = true;
        
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
    if (!currentData || !currentData.service_lines || index >= currentData.service_lines.length) return;
    
    // Create a copy of the service line
    const updatedLine = {...currentData.service_lines[index]};
    // Update the field in the copy
    updatedLine[field] = value;
    
    // Create a copy of the service lines array
    const newServiceLines = [...currentData.service_lines];
    // Update the service line in the array
    newServiceLines[index] = updatedLine;
    // Update the data
    currentData.service_lines = newServiceLines;
    
    // Mark as modified
    window.serviceLinesModified = true;
    
    // Mark save button as modified
    const saveButton = document.getElementById('saveButton');
    if (saveButton) {
        saveButton.classList.add('data-modified');
        saveButton.textContent = `Save Changes (Modified)`;
    }
}

/**
 * Update modifiers for a service line
 * @param {number} index - Index of the service line
 * @param {string} modifiersStr - Comma-separated modifiers
 */
function updateServiceLineModifiers(index, modifiersStr) {
    if (!currentData || !currentData.service_lines || index >= currentData.service_lines.length) return;
    
    // Convert comma-separated string to array, removing empty items and trimming whitespace
    const modifiersArray = modifiersStr
        .split(',')
        .map(mod => mod.trim())
        .filter(mod => mod.length > 0);
    
    // Create a copy of the service line
    const updatedLine = {...currentData.service_lines[index]};
    // Update the modifiers in the copy
    updatedLine.modifiers = modifiersArray;
    
    // Create a copy of the service lines array
    const newServiceLines = [...currentData.service_lines];
    // Update the service line in the array
    newServiceLines[index] = updatedLine;
    // Update the data
    currentData.service_lines = newServiceLines;
    
    // Mark as modified
    window.serviceLinesModified = true;
    
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
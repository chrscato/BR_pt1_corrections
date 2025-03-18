/**
 * Render provider details in the UI with specific missing codes
 * @param {Object} data - Provider data from the server
 */
function renderProviderDetails(data) {
    // Clear any existing content
    const detailsContainer = document.getElementById('providerDetails');
    if (!detailsContainer) return;

    // Create network badge
    const networkBadge = data.network ? 
        `<span class="badge bg-secondary">${data.network}</span>` : '';

    // Update provider info area
    document.getElementById('providerInfo').innerHTML = `
        <div class="provider-header">
            <h5>${data.name || 'Unknown Provider'}</h5>
            ${networkBadge}
        </div>
        <p class="mb-2">TIN: ${formatTIN(data.tin)}</p>
        <p class="mb-0">
            <small>
                ${data.total_line_items} total line items, 
                ${data.missing_rate_items.length} missing rates
            </small>
        </p>
    `;

    // Render missing rates table
    const missingRatesTable = document.getElementById('missingRatesTable');
    if (missingRatesTable && data.missing_rate_items.length > 0) {
        const tableBody = missingRatesTable.querySelector('tbody');
        tableBody.innerHTML = '';

        data.missing_rate_items.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.cpt_code}</td>
                <td>${item.description || 'N/A'}</td>
                <td>${item.current_category || 'Uncategorized'}</td>
                <td>
                    <div class="input-group input-group-sm">
                        <input type="number" class="form-control rate-input" 
                               data-cpt="${item.cpt_code}"
                               placeholder="Enter rate"
                               step="0.01"
                               min="0">
                        <button class="btn btn-primary save-line-item" 
                                data-cpt="${item.cpt_code}">
                            Save
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Show the missing rates section
        document.getElementById('missingRatesSection').classList.remove('d-none');
    } else {
        // Hide the missing rates section if no missing rates
        document.getElementById('missingRatesSection').classList.add('d-none');
    }

    // Render current rates table
    const currentRatesTable = document.getElementById('currentRatesTable');
    if (currentRatesTable && data.current_rates.length > 0) {
        const tableBody = currentRatesTable.querySelector('tbody');
        tableBody.innerHTML = '';

        data.current_rates.forEach(rate => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${rate.cpt_code}</td>
                <td>${rate.category || 'Uncategorized'}</td>
                <td>$${rate.rate.toFixed(2)}</td>
                <td>${rate.modifier || 'N/A'}</td>
            `;
            tableBody.appendChild(row);
        });

        // Show the current rates section
        document.getElementById('currentRatesSection').classList.remove('d-none');
    } else {
        // Hide the current rates section if no current rates
        document.getElementById('currentRatesSection').classList.add('d-none');
    }

    // Setup event listeners for save buttons
    setupSaveButtonListeners();
}

function setupSaveButtonListeners() {
    // Remove existing listeners
    document.querySelectorAll('.save-line-item').forEach(button => {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
    });

    // Add new listeners
    document.querySelectorAll('.save-line-item').forEach(button => {
        button.addEventListener('click', async () => {
            const cptCode = button.dataset.cpt;
            const rateInput = document.querySelector(`input[data-cpt="${cptCode}"]`);
            
            if (!rateInput || !rateInput.value) {
                showErrorToast('Please enter a rate value');
                return;
            }

            const rate = parseFloat(rateInput.value);
            if (isNaN(rate) || rate <= 0) {
                showErrorToast('Please enter a valid positive rate');
                return;
            }

            try {
                button.disabled = true;
                await window.rateCorrections.saveLineItemCorrections([{
                    cpt_code: cptCode,
                    rate: rate
                }]);
            } finally {
                button.disabled = false;
            }
        });
    });
}

/**
 * Extract missing CPT codes with their categories from failure records
 * @param {Array} failures - Array of failure records
 * @returns {Array} Array of objects with code, category, and description
 */
function extractMissingCodes(failures) {
    const missingCodesMap = {};
    
    failures.forEach(failure => {
        if (failure.rates && Array.isArray(failure.rates)) {
            failure.rates.forEach(rate => {
                if (rate.cpt && !missingCodesMap[rate.cpt]) {
                    missingCodesMap[rate.cpt] = {
                        code: rate.cpt,
                        category: rate.category || 'Uncategorized',
                        description: rate.description || '',
                        filename: failure.file_name || ''
                    };
                }
            });
        }
    });
    
    return Object.values(missingCodesMap);
}

/**
 * Render the missing codes table
 * @param {Array} missingCodes - Array of missing code objects
 */
function renderMissingCodesTable(missingCodes) {
    const table = document.getElementById('missingCodesTable');
    if (!table) return;
    
    // Clear table
    table.innerHTML = '';
    
    // Sort by category then code
    missingCodes.sort((a, b) => {
        if (a.category !== b.category) {
            return a.category.localeCompare(b.category);
        }
        return a.code.localeCompare(b.code);
    });
    
    // Add rows for each missing code
    missingCodes.forEach(codeInfo => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${codeInfo.code}</td>
            <td>${codeInfo.category}</td>
            <td>${codeInfo.description || 'N/A'}</td>
            <td>
                <div class="input-group input-group-sm">
                    <span class="input-group-text">$</span>
                    <input type="number" class="form-control form-control-sm code-rate-input" 
                           data-code="${codeInfo.code}" min="0" step="0.01" placeholder="0.00">
                </div>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-primary set-code-rate-btn" 
                        data-code="${codeInfo.code}" data-category="${codeInfo.category}">
                    Set Rate
                </button>
            </td>
        `;
        table.appendChild(row);
    });
    
    // Add event listeners to the set rate buttons
    const setRateButtons = table.querySelectorAll('.set-code-rate-btn');
    setRateButtons.forEach(button => {
        button.addEventListener('click', function() {
            const code = this.getAttribute('data-code');
            const category = this.getAttribute('data-category');
            const inputElement = table.querySelector(`.code-rate-input[data-code="${code}"]`);
            const rate = parseFloat(inputElement.value);
            
            if (isNaN(rate) || rate <= 0) {
                showAlert('Please enter a valid rate greater than zero', 'warning');
                return;
            }
            
            setIndividualCodeRate(code, rate, category);
        });
    });
}

/**
 * Set the rate for an individual CPT code
 * @param {string} code - The CPT code
 * @param {number} rate - The rate value
 * @param {string} category - The code's category
 */
async function setIndividualCodeRate(code, rate, category) {
    try {
        const currentTIN = window.RateCorrections.currentTIN;
        const currentProviderName = window.RateCorrections.currentProviderName;
        
        if (!currentTIN) {
            showAlert('No provider selected', 'warning');
            return;
        }
        
        // Show confirmation
        if (!confirm(`Set rate for CPT ${code} to $${rate.toFixed(2)}?`)) {
            return;
        }
        
        // Show loading state
        const button = document.querySelector(`.set-code-rate-btn[data-code="${code}"]`);
        if (button) {
            button.disabled = true;
            button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
        }
        
        // Send request to update rate
        const response = await fetch('/rate_corrections/api/update_code_rate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                tin: currentTIN,
                provider_name: currentProviderName,
                cpt_code: code,
                category: category,
                rate: rate
            }),
        });
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // Show success message
        showAlert(`Rate for CPT ${code} updated successfully!`, 'success');
        
        // Reload TIN details to refresh rates
        loadTINDetails(currentTIN, currentProviderName);
        
    } catch (error) {
        console.error('Error setting individual code rate:', error);
        showAlert(`Error setting rate: ${error.message}`, 'error');
        
        // Reset button
        const button = document.querySelector(`.set-code-rate-btn[data-code="${code}"]`);
        if (button) {
            button.disabled = false;
            button.textContent = 'Set Rate';
        }
    }
}
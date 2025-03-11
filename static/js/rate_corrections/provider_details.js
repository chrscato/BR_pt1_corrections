/**
 * Render provider details in the UI with specific missing codes
 * @param {Object} data - Provider data from the server
 */
function renderProviderDetails(data) {
    // No failures found
    if (!data.failures || data.failures.length === 0) {
        document.getElementById('providerInfo').innerHTML = `
            <div class="alert alert-warning">
                No rate failures found for TIN: ${formatTIN(data.tin)}
            </div>
        `;
        document.getElementById('providerDetails').classList.add('d-none');
        return;
    }
    
    // Show provider details
    document.getElementById('providerDetails').classList.remove('d-none');
    
    // Get provider info from first failure record
    const providerInfo = data.failures[0].provider_info || {};
    
    // Update provider details
    document.getElementById('providerName').textContent = 
        window.RateCorrections.currentProviderName || 'Unknown Provider';
    document.getElementById('providerTIN').textContent = formatTIN(data.tin);
    document.getElementById('providerNPI').textContent = providerInfo.NPI || 'N/A';
    document.getElementById('providerNetwork').textContent = providerInfo['Provider Network'] || 'Unknown';
    document.getElementById('providerLocation').textContent = providerInfo['Location'] || 'Unknown';
    document.getElementById('providerStatus').textContent = providerInfo['Provider Status'] || 'Unknown';
    
    // Network status badge
    const networkStatus = providerInfo['Provider Network'] || '';
    const isOutOfNetwork = typeof networkStatus === 'string' && networkStatus.includes('Out');
    const networkClass = isOutOfNetwork ? 'danger' : 'success';
    const networkBadge = `<span class="badge bg-${networkClass}">${networkStatus}</span>`;
    
    // Update provider info area
    document.getElementById('providerInfo').innerHTML = `
        <div class="provider-header">
            <h5>${window.RateCorrections.currentProviderName || 'Unknown Provider'}</h5>
            ${networkBadge}
        </div>
        <p class="mb-2">TIN: ${formatTIN(data.tin)}</p>
        <p class="mb-0"><small>${data.failures.length} rate failures found</small></p>
    `;
    
    // Extract missing CPT codes with their categories
    const missingCodes = extractMissingCodes(data.failures);
    
    // Display missing codes section if not empty
    const missingCodesSection = document.getElementById('missingCodesSection');
    if (missingCodesSection) {
        if (missingCodes.length > 0) {
            missingCodesSection.classList.remove('d-none');
            renderMissingCodesTable(missingCodes);
        } else {
            missingCodesSection.classList.add('d-none');
        }
    }
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
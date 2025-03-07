/**
 * Provider management functionality for the Rate Corrections tool
 */

// Ensure the global state object exists
if (!window.RateCorrections) {
    window.RateCorrections = {
        currentTIN: null,
        currentProviderName: null,
        currentProviderData: null,
        selectedCategories: {},
        allCategories: {},
        currentRates: []
    };
}

/**
 * Load the list of TINs with rate failures
 */
async function loadTINs() {
    try {
        console.log('Loading TINs with rate failures...');
        const response = await fetch('/rate_corrections/api/tins');
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Validate data
        if (data.error) {
            console.error('Server reported error:', data.error);
            showAlert(data.error, 'error');
            return;
        }
        
        const tinList = document.getElementById('tinList');
        tinList.innerHTML = '';
        
        // Update TIN count badge
        const tinCount = document.getElementById('tinCount');
        if (tinCount) {
            tinCount.textContent = data.tins ? data.tins.length : '0';
        }

        if (!data.tins || data.tins.length === 0) {
            tinList.innerHTML = '<div class="list-group-item">No TINs with rate failures found</div>';
            return;
        }

        // Render TIN list
        data.tins.forEach(tin => {
            const listItem = createTINListItem(tin);
            tinList.appendChild(listItem);
        });
    } catch (error) {
        console.error('Error loading TINs:', error);
        showAlert(`Error loading TINs: ${error.message}`, 'error');
    }
}

/**
 * Create a list item for a TIN
 * @param {Object} tin - TIN data object
 * @returns {HTMLAnchorElement} Created list item
 */
function createTINListItem(tin) {
    const listItem = document.createElement('a');
    listItem.className = 'list-group-item list-group-item-action';
    listItem.href = '#';

    // Format the TIN with dashes
    const formattedTIN = formatTIN(tin.tin);
    
    // Determine network status
    const networkStatus = tin.provider_network || '';
    const isOutOfNetwork = typeof networkStatus === 'string' && networkStatus.includes('Out');
    const networkBadge = isOutOfNetwork 
        ? '<span class="badge bg-danger">Out of Network</span>' 
        : '<span class="badge bg-success">In Network</span>';

    listItem.innerHTML = `
        <div class="d-flex w-100 justify-content-between">
            <h6 class="mb-1">${tin.provider_name || 'Unknown Provider'}</h6>
            <small>${networkBadge}</small>
        </div>
        <p class="mb-1 small">TIN: ${formattedTIN}</p>
        <div class="d-flex w-100 justify-content-between">
            <small>${tin.cpt_codes ? tin.cpt_codes.length : 0} CPT codes</small>
            <small class="text-danger">${tin.failures_count || 0} failures</small>
        </div>
    `;

    listItem.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Remove active class from all TINs
        document.querySelectorAll('#tinList a').forEach(a => a.classList.remove('active'));
        
        // Add active class to clicked TIN
        listItem.classList.add('active');
        
        // Load TIN details
        loadTINDetails(tin.tin, tin.provider_name || 'Unknown Provider');
    });

    return listItem;
}

/**
 * Load detailed information for a specific TIN
 * @param {string} tin - TIN to load
 * @param {string} providerName - Name of the provider
 */
async function loadTINDetails(tin, providerName) {
    try {
        console.log(`Loading details for TIN: ${tin}`);
        
        // Update global state using the window object
        window.RateCorrections.currentTIN = tin;
        window.RateCorrections.currentProviderName = providerName;
        
        // Show loading indicator
        document.getElementById('providerInfo').innerHTML = `
            <div class="alert alert-info">
                Loading provider details for TIN: ${formatTIN(tin)}...
            </div>
        `;
        
        // Reset selected categories
        window.RateCorrections.selectedCategories = {};
        
        // Fetch TIN details
        const response = await fetch(`/rate_corrections/api/tin/${tin}/details`);
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Validate data
        if (data.error) {
            console.error('Server reported error:', data.error);
            showAlert(data.error, 'error');
            return;
        }
        
        // Update global state
        window.RateCorrections.currentProviderData = data;
        
        // Render provider details
        renderProviderDetails(data);
        
        // Extract and display unique CPT codes from failures
        renderFailedCPTCodes(data.failures || []);
        
        // Render current rates
        renderCurrentRates(data.current_rates || []);
    } catch (error) {
        console.error('Error loading TIN details:', error);
        showAlert(`Error loading TIN details: ${error.message}`, 'error');
        
        document.getElementById('providerInfo').innerHTML = `
            <div class="alert alert-danger">
                Error loading provider details: ${error.message}
            </div>
        `;
    }
}

/**
 * Render failed CPT codes in the table
 * @param {Array} failures - Array of failure records
 */
function renderFailedCPTCodes(failures) {
    const table = document.getElementById('failedFilesTable');
    
    // Clear table
    table.innerHTML = '';
    
    if (failures.length === 0) {
        table.innerHTML = `<tr><td colspan="3" class="text-center">No failed codes found</td></tr>`;
        return;
    }
    
    // Extract unique CPT codes from failures
    const uniqueCPTCodes = new Set();
    const cptsWithCategories = [];

    failures.forEach(failure => {
        // Handle multiple rate checks in a single failure
        if (failure.rates && Array.isArray(failure.rates)) {
            failure.rates.forEach(rate => {
                if (rate.cpt && !uniqueCPTCodes.has(rate.cpt)) {
                    uniqueCPTCodes.add(rate.cpt);
                    cptsWithCategories.push({
                        cpt: rate.cpt,
                        category: rate.category || 'Uncategorized'
                    });
                }
            });
        }
    });

    // Render CPT codes
    cptsWithCategories.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.cpt}</td>
            <td>${item.category}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="validateCPT('${item.cpt}')">
                    Validate
                </button>
            </td>
        `;
        table.appendChild(row);
    });
}

/**
 * Validate a CPT code
 * @param {string} cptCode - CPT code to validate
 */
function validateCPT(cptCode) {
    fetch('/rate_corrections/api/validate_cpt', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cpt_code: cptCode })
    })
    .then(response => response.json())
    .then(data => {
        if (data.valid) {
            showAlert(`CPT ${cptCode} is valid. Description: ${data.description}`, 'success');
        } else {
            showAlert(`CPT ${cptCode} is not valid: ${data.message}`, 'warning');
        }
    })
    .catch(error => {
        console.error('Error validating CPT:', error);
        showAlert(`Error validating CPT ${cptCode}`, 'error');
    });
}

/**
 * Render provider details in the UI
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
}

/**
 * Render current rates in the table
 * @param {Array} rates - Array of current rates for the provider
 */
function renderCurrentRates(rates) {
    const table = document.getElementById('currentRatesTable');
    const ratesCount = document.getElementById('ratesCount');
    
    // Store rates globally
    window.RateCorrections.currentRates = rates;
    
    // Update rates count
    if (ratesCount) {
        ratesCount.textContent = rates.length;
    }
    
    // Clear table
    table.innerHTML = '';
    
    if (!rates || rates.length === 0) {
        table.innerHTML = `<tr><td colspan="3" class="text-center">No rates found for this provider</td></tr>`;
        return;
    }
    
    // Sort rates with robust error handling
    const sortedRates = [...rates].sort((a, b) => {
        // Handle null or undefined values
        const categoryA = a?.category || '';
        const categoryB = b?.category || '';
        const procCdA = a?.proc_cd || '';
        const procCdB = b?.proc_cd || '';
        
        // Compare categories first
        if (categoryA !== categoryB) {
            return categoryA.localeCompare(categoryB);
        }
        
        // If categories are the same, compare procedure codes
        return procCdA.localeCompare(procCdB);
    });
    
    // Render rates
    sortedRates.forEach(rate => {
        // Ensure rate exists and has necessary properties
        if (!rate) return;
        
        const row = document.createElement('tr');
        row.id = `rate-${rate.proc_cd || 'unknown'}`;
        row.innerHTML = `
            <td>${rate.proc_cd || 'N/A'}</td>
            <td>${rate.category || 'N/A'}</td>
            <td>$${parseFloat(rate.rate || 0).toFixed(2)}</td>
        `;
        table.appendChild(row);
    });
}

// Utility functions (in case they're not defined globally)
function formatTIN(tin) {
    if (!tin || tin.length !== 9) return tin;
    return `${tin.substring(0, 2)}-${tin.substring(2)}`;
}

function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    try {
        return new Date(dateStr).toLocaleDateString();
    } catch {
        return dateStr;
    }
}

// Shows an alert (in case it's not defined globally)
function showAlert(message, type = 'success', duration = 3000) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.classList.remove('show');
        setTimeout(() => alertDiv.remove(), 300);
    }, duration);
}
/**
 * Provider management functionality for the Rate Corrections tool
 */

// Initialize global state object for rate corrections
window.RateCorrections = window.RateCorrections || {
    currentTIN: null,
    currentProviderName: null,
    currentProviderData: null,
    selectedCategories: {},
    allCategories: {},
    currentRates: [],
    missingCodes: []
};

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
        if (!tinList) {
            console.error("TIN list element not found.");
            return;
        }
        
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

        console.log(`Found ${data.tins.length} providers with rate failures`);

        // Render TIN list
        data.tins.forEach(tin => {
            const listItem = document.createElement('a');
            listItem.className = 'list-group-item list-group-item-action';
            listItem.href = '#';

            // Format the TIN with dashes
            const formattedTIN = formatTIN(tin.tin);
            
            // Determine network status
            const networkStatus = tin.provider_network || '';
            const isOutOfNetwork = typeof networkStatus === 'string' && networkStatus.toLowerCase().includes('out');
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
                <div class="mt-2">
                    <button class="btn btn-sm btn-outline-primary me-1 view-provider-btn" 
                            data-tin="${tin.tin}" 
                            data-name="${tin.provider_name || 'Unknown Provider'}">
                        View
                    </button>
                    <button class="btn btn-sm btn-outline-success select-provider-btn" 
                            data-tin="${tin.tin}" 
                            data-name="${tin.provider_name || 'Unknown Provider'}">
                        Select
                    </button>
                </div>
            `;
            
            tinList.appendChild(listItem);
        });
        
        // Add event listeners to buttons
        setupProviderButtons();
        
        console.log('TIN list loaded successfully');
    } catch (error) {
        console.error('Error loading TINs:', error);
        showAlert(`Error loading TINs: ${error.message}`, 'error');
        
        const tinList = document.getElementById('tinList');
        if (tinList) {
            tinList.innerHTML = `
                <div class="list-group-item text-danger">
                    Error loading providers: ${error.message}
                </div>
            `;
        }
    }
}

/**
 * Set up event listeners for provider selection buttons
 */
function setupProviderButtons() {
    // View provider buttons
    const viewButtons = document.querySelectorAll('.view-provider-btn');
    viewButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const tin = this.getAttribute('data-tin');
            const name = this.getAttribute('data-name');
            
            // Highlight the selected provider item
            highlightSelectedProvider(tin);
            
            // Load the provider details
            loadTINDetails(tin, name);
        });
    });
    
    // Select provider buttons
    const selectButtons = document.querySelectorAll('.select-provider-btn');
    selectButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const tin = this.getAttribute('data-tin');
            const name = this.getAttribute('data-name');
            
            // Highlight the selected provider item
            highlightSelectedProvider(tin);
            
            // Load the provider details
            loadTINDetails(tin, name);
            
            // Additionally, mark as selected for batch operations
            toggleProviderSelection(tin, name, this);
        });
    });
}

/**
 * Highlight the selected provider in the list
 * @param {string} tin - TIN to highlight
 */
function highlightSelectedProvider(tin) {
    // Remove active class from all items
    const allItems = document.querySelectorAll('#tinList .list-group-item');
    allItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // Find the item containing the TIN and add active class
    const buttons = document.querySelectorAll(`.view-provider-btn[data-tin="${tin}"]`);
    buttons.forEach(button => {
        const listItem = button.closest('.list-group-item');
        if (listItem) {
            listItem.classList.add('active');
        }
    });
}

/**
 * Toggle provider selection for batch operations
 * @param {string} tin - TIN to toggle
 * @param {string} name - Provider name
 * @param {HTMLElement} button - The button element
 */
function toggleProviderSelection(tin, name, button) {
    const isSelected = button.classList.contains('btn-success');
    
    if (isSelected) {
        // Deselect
        button.textContent = 'Select';
        button.classList.remove('btn-success');
        button.classList.add('btn-outline-success');
    } else {
        // Select
        button.textContent = 'Selected';
        button.classList.remove('btn-outline-success');
        button.classList.add('btn-success');
    }
    
    // Update the provider selection state (if using batch operations)
    if (typeof updateProviderSelection === 'function') {
        updateProviderSelection(tin, name, !isSelected);
    }
}

/**
 * Load detailed information for a specific TIN
 * @param {string} tin - TIN to load
 * @param {string} providerName - Name of the provider
 */
async function loadTINDetails(tin, providerName) {
    try {
        console.log(`Loading details for TIN: ${tin}`);
        
        // Update global state
        window.RateCorrections.currentTIN = tin;
        window.RateCorrections.currentProviderName = providerName;
        
        // Show loading indicator
        const providerInfo = document.getElementById('providerInfo');
        if (providerInfo) {
            providerInfo.innerHTML = `
                <div class="alert alert-info">
                    <div class="d-flex align-items-center">
                        <div class="spinner-border spinner-border-sm me-2" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <span>Loading provider details for TIN: ${formatTIN(tin)}...</span>
                    </div>
                </div>
            `;
        }
        
        // Update provider name in header
        const providerNameElem = document.getElementById('providerName');
        if (providerNameElem) {
            providerNameElem.textContent = providerName;
        }
        
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
        
        console.log('TIN details loaded:', data);
        
        // Store data globally
        window.RateCorrections.currentProviderData = data;
        
        // Process the data to extract missing CPT codes
        processMissingCodes(data);
        
        // Display provider details
        displayProviderDetails(data);
        
        // Show the guided workflow
        showGuidedWorkflow();
        
        // Render current rates
        renderCurrentRates(data.current_rates || []);
        
        console.log(`Successfully loaded details for TIN: ${tin}`);
    } catch (error) {
        console.error('Error loading TIN details:', error);
        showAlert(`Error loading TIN details: ${error.message}`, 'error');
        
        const providerInfo = document.getElementById('providerInfo');
        if (providerInfo) {
            providerInfo.innerHTML = `
                <div class="alert alert-danger">
                    Error loading provider details: ${error.message}
                </div>
            `;
        }
    }
}

/**
 * Process the data to extract missing CPT codes with their categories
 * @param {Object} data - Provider data from the server
 */
function processMissingCodes(data) {
    // Initialize missing codes array
    const missingCodes = [];
    
    // Extract missing codes from failures
    if (data.failures && Array.isArray(data.failures)) {
        const codeMap = new Map(); // Use a Map to avoid duplicates
        
        data.failures.forEach(failure => {
            if (failure.rates && Array.isArray(failure.rates)) {
                failure.rates.forEach(rate => {
                    if (rate.cpt && !codeMap.has(rate.cpt)) {
                        codeMap.set(rate.cpt, {
                            code: rate.cpt,
                            category: rate.category || 'Uncategorized',
                            description: rate.description || '',
                            fileName: failure.file_name || ''
                        });
                    }
                });
            }
        });
        
        // Convert Map to array
        missingCodes.push(...codeMap.values());
    }
    
    // Sort missing codes by category, then code
    missingCodes.sort((a, b) => {
        if (a.category !== b.category) {
            return a.category.localeCompare(b.category);
        }
        return a.code.localeCompare(b.code);
    });
    
    // Store missing codes globally
    window.RateCorrections.missingCodes = missingCodes;
    
    console.log(`Processed ${missingCodes.length} missing CPT codes for provider`);
}

/**
 * Display provider details in the UI
 * @param {Object} data - Provider data from the server
 */
function displayProviderDetails(data) {
    // Show the provider details section
    const providerDetails = document.getElementById('providerDetails');
    if (providerDetails) {
        providerDetails.classList.remove('d-none');
    }
    
    // Get provider info from first failure record if available
    const providerInfo = data.failures && data.failures.length > 0 ? 
        (data.failures[0].provider_info || {}) : {};
    
    // Update provider details if the elements exist
    updateElementText('providerNameDetails', window.RateCorrections.currentProviderName);
    updateElementText('providerTIN', formatTIN(data.tin));
    updateElementText('providerNPI', providerInfo.NPI || 'N/A');
    updateElementText('providerNetwork', providerInfo['Provider Network'] || 'Unknown');
    updateElementText('providerLocation', providerInfo['Location'] || 'Unknown');
    updateElementText('providerStatus', providerInfo['Provider Status'] || 'Unknown');
    
    // Update the provider info section
    const providerInfoSection = document.getElementById('providerInfo');
    if (providerInfoSection) {
        // Network status badge
        const networkStatus = providerInfo['Provider Network'] || '';
        const isOutOfNetwork = typeof networkStatus === 'string' && networkStatus.toLowerCase().includes('out');
        const networkClass = isOutOfNetwork ? 'danger' : 'success';
        const networkBadge = `<span class="badge bg-${networkClass}">${networkStatus}</span>`;
        
        providerInfoSection.innerHTML = `
            <div class="provider-header mb-3">
                <div class="d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">${window.RateCorrections.currentProviderName || 'Unknown Provider'}</h5>
                    ${networkBadge}
                </div>
                <p class="mb-1">TIN: ${formatTIN(data.tin)}</p>
                <p class="mb-0">
                    <span class="badge bg-warning">${window.RateCorrections.missingCodes.length} missing CPT codes</span>
                    <span class="badge bg-info">${data.failures ? data.failures.length : 0} failures</span>
                </p>
            </div>
            
            <div class="missing-codes-summary mb-3">
                <h6>Missing CPT Codes by Category:</h6>
                <div class="code-categories-container">
                    ${generateCategorySummary()}
                </div>
            </div>
        `;
    }
}

/**
 * Generate a summary of missing codes by category
 * @returns {string} HTML for category summary
 */
function generateCategorySummary() {
    const missingCodes = window.RateCorrections.missingCodes || [];
    
    if (missingCodes.length === 0) {
        return '<div class="alert alert-info">No missing CPT codes found</div>';
    }
    
    // Group codes by category
    const categoryMap = new Map();
    
    missingCodes.forEach(code => {
        if (!categoryMap.has(code.category)) {
            categoryMap.set(code.category, []);
        }
        categoryMap.get(code.category).push(code);
    });
    
    // Generate HTML for each category
    let html = '';
    
    categoryMap.forEach((codes, category) => {
        html += `
            <div class="category-group mb-2">
                <div class="category-header">
                    <span class="badge bg-secondary">${category}</span>
                    <span class="badge bg-light text-dark">${codes.length} codes</span>
                </div>
                <div class="category-codes">
                    ${codes.map(code => 
                        `<span class="code-chip" title="${code.description || code.code}">${code.code}</span>`
                    ).join('')}
                </div>
            </div>
        `;
    });
    
    return html;
}

/**
 * Render the current rates for the provider
 * @param {Array} rates - Array of current rates
 */
function renderCurrentRates(rates) {
    const table = document.getElementById('currentRatesTable');
    if (!table) {
        console.error('Current rates table element not found');
        return;
    }
    
    // Update rates count
    const ratesCount = document.getElementById('ratesCount');
    if (ratesCount) {
        ratesCount.textContent = rates.length.toString();
    }
    
    // Clear table
    table.innerHTML = '';
    
    if (!rates || rates.length === 0) {
        table.innerHTML = '<tr><td colspan="3" class="text-center">No current rates found for this provider</td></tr>';
        return;
    }
    
    // Sort rates by category then code
    const sortedRates = [...rates].sort((a, b) => {
        const categoryA = a.category || '';
        const categoryB = b.category || '';
        const procCdA = a.proc_cd || '';
        const procCdB = b.proc_cd || '';
        
        if (categoryA !== categoryB) {
            return categoryA.localeCompare(categoryB);
        }
        return procCdA.localeCompare(procCdB);
    });
    
    // Add rows
    sortedRates.forEach(rate => {
        const row = document.createElement('tr');
        
        // Format rate with 2 decimal places
        const formattedRate = typeof rate.rate === 'number' ? 
            `$${rate.rate.toFixed(2)}` : 
            (rate.rate ? `$${rate.rate}` : 'N/A');
        
        row.innerHTML = `
            <td>${rate.proc_cd || 'N/A'}</td>
            <td>${rate.category || 'N/A'}</td>
            <td>${formattedRate}</td>
        `;
        
        table.appendChild(row);
    });
    
    console.log(`Displayed ${rates.length} current rates`);
}

/**
 * Helper function to update element text content if element exists
 * @param {string} id - Element ID
 * @param {string} text - Text to set
 */
function updateElementText(id, text) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = text;
    }
}

/**
 * Format a TIN with dashes
 * @param {string} tin - The TIN to format
 * @returns {string} - Formatted TIN (XX-XXXXXXX)
 */
function formatTIN(tin) {
    if (!tin) return 'N/A';
    
    // Clean tin to just digits
    const cleanTin = String(tin).replace(/\D/g, '');
    
    if (cleanTin.length !== 9) return tin;
    
    return `${cleanTin.substring(0, 2)}-${cleanTin.substring(2)}`;
}

/**
 * Format currency for display
 * @param {number|string} amount - Amount to format
 * @returns {string} - Formatted currency
 */
function formatCurrency(amount) {
    if (amount === undefined || amount === null) return '$0.00';
    
    try {
        const value = typeof amount === 'string' ? 
            parseFloat(amount.replace(/[$,]/g, '')) : amount;
            
        return `$${value.toFixed(2)}`;
    } catch (e) {
        return '$0.00';
    }
}

/**
 * Show an alert message that automatically disappears
 * @param {string} message - The message to display
 * @param {string} type - Alert type ('success', 'error', 'info', 'warning')
 * @param {number} duration - Duration in milliseconds
 */
function showAlert(message, type = 'success', duration = 3000) {
    // Create the alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    
    // Add the message
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Add to the document
    document.body.appendChild(alertDiv);
    
    // Remove after the specified duration
    setTimeout(() => {
        alertDiv.classList.remove('show');
        setTimeout(() => {
            alertDiv.remove();
        }, 300);
    }, duration);
}

// Initialize the module
document.addEventListener('DOMContentLoaded', function() {
    console.log('Provider management module initialized');
    loadTINs();
});

// Export functions to global scope
window.loadTINs = loadTINs;
window.loadTINDetails = loadTINDetails;
window.renderCurrentRates = renderCurrentRates;
window.showAlert = showAlert;
window.formatTIN = formatTIN;
window.formatCurrency = formatCurrency;
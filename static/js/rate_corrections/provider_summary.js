/**
 * Provider Summary functionality for the Rate Corrections tool
 * Handles displaying provider information and selection
 */

// Global variables
let selectedProviders = new Set();
let currentProvider = null;

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', function() {
    // Set up provider selection scope handlers
    setupProviderScopeHandlers();
});

/**
 * Display the provider summary in the table
 * @param {Object} providerSummary - The provider summary data
 */
function displayProviderSummary(providerSummary) {
    const table = document.getElementById('providerSummaryTable');
    
    if (!table) {
        console.error('Provider summary table element not found');
        return;
    }
    
    // Clear table
    table.innerHTML = '';
    
    if (!providerSummary || Object.keys(providerSummary).length === 0) {
        table.innerHTML = '<tr><td colspan="4" class="text-center">No providers with missing rates found</td></tr>';
        return;
    }
    
    // Sort providers by number of missing codes (highest first)
    const sortedProviders = Object.entries(providerSummary)
        .sort((a, b) => b[1].codes_count - a[1].codes_count);
    
    // Create table rows
    sortedProviders.forEach(([tin, data]) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatProviderName(data.name)}</td>
            <td>${formatNetworkStatus(data.network)}</td>
            <td>${data.codes_count}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary view-provider-btn" 
                        data-tin="${tin}" data-name="${data.name}">
                    View
                </button>
                <button class="btn btn-sm ${selectedProviders.has(tin) ? 'btn-success' : 'btn-outline-success'} select-provider-btn" 
                        data-tin="${tin}" data-name="${data.name}">
                    ${selectedProviders.has(tin) ? 'Selected' : 'Select'}
                </button>
            </td>
        `;
        
        table.appendChild(row);
    });
    
    // Add event listeners to the view buttons
    const viewButtons = table.querySelectorAll('.view-provider-btn');
    viewButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tin = this.getAttribute('data-tin');
            const name = this.getAttribute('data-name');
            viewProviderDetails(tin, name);
        });
    });
    
    // Add event listeners to the select buttons
    const selectButtons = table.querySelectorAll('.select-provider-btn');
    selectButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tin = this.getAttribute('data-tin');
            const name = this.getAttribute('data-name');
            toggleProviderSelection(tin, name, this);
        });
    });
}

/**
 * Format a provider name for display
 * @param {string} name - The provider name
 * @returns {string} - Formatted provider name
 */
function formatProviderName(name) {
    if (!name) return 'Unknown Provider';
    
    // If name is too long, truncate it with ellipsis
    if (name.length > 20) {
        return name.substring(0, 20) + '...';
    }
    
    return name;
}

/**
 * Format a network status for display
 * @param {string} status - The network status
 * @returns {string} - Formatted network status badge
 */
function formatNetworkStatus(status) {
    if (!status) return '<span class="badge bg-secondary">Unknown</span>';
    
    if (status.includes('Out')) {
        return '<span class="badge bg-danger">Out of Network</span>';
    } else if (status.includes('In')) {
        return '<span class="badge bg-success">In Network</span>';
    } else if (status.includes('Pending')) {
        return '<span class="badge bg-warning">Pending</span>';
    }
    
    return `<span class="badge bg-secondary">${status}</span>`;
}

/**
 * View details for a specific provider
 * @param {string} tin - The provider TIN
 * @param {string} name - The provider name
 */
function viewProviderDetails(tin, name) {
    // Store current provider
    currentProvider = {
        tin: tin,
        name: name
    };
    
    // Show provider details card
    const providerDetailsCard = document.getElementById('providerDetailsCard');
    if (providerDetailsCard) {
        providerDetailsCard.classList.remove('d-none');
    }
    
    // Update provider name
    const selectedProviderName = document.getElementById('selectedProviderName');
    if (selectedProviderName) {
        selectedProviderName.textContent = name || 'Unknown Provider';
    }
    
    // Get provider details from summary data
    if (!codeSummaryData || !codeSummaryData.provider_summary || !codeSummaryData.provider_summary[tin]) {
        return;
    }
    
    const providerData = codeSummaryData.provider_summary[tin];
    
    // Update provider details
    const providerDetails = document.getElementById('providerDetails');
    if (providerDetails) {
        providerDetails.innerHTML = `
            <div class="mb-3">
                <p><strong>TIN:</strong> ${formatTIN(tin)}</p>
                <p><strong>Network Status:</strong> ${formatNetworkStatus(providerData.network)}</p>
                <p><strong>Missing Codes:</strong> ${providerData.codes_count}</p>
            </div>
        `;
    }
    
    // Display provider codes
    const providerCodesList = document.getElementById('providerCodesList');
    if (providerCodesList) {
        const codesContainer = providerCodesList.querySelector('.code-chips-container');
        if (codesContainer) {
            displayCodeChips(codesContainer, providerData.codes);
        }
    }
    
    // Highlight this provider in the table
    highlightProviderRow(tin);
}

/**
 * Highlight the selected provider row in the table
 * @param {string} tin - The provider TIN
 */
function highlightProviderRow(tin) {
    // Remove highlight from all rows
    const allRows = document.querySelectorAll('#providerSummaryTable tr');
    allRows.forEach(row => {
        row.classList.remove('table-primary');
    });
    
    // Add highlight to the selected provider row
    allRows.forEach(row => {
        const viewButton = row.querySelector('.view-provider-btn');
        if (viewButton && viewButton.getAttribute('data-tin') === tin) {
            row.classList.add('table-primary');
        }
    });
}

/**
 * Toggle provider selection for targeted rate updates
 * @param {string} tin - The provider TIN
 * @param {string} name - The provider name
 * @param {HTMLElement} button - The button element that was clicked
 */
function toggleProviderSelection(tin, name, button) {
    if (selectedProviders.has(tin)) {
        // Remove provider from selection
        selectedProviders.delete(tin);
        
        // Update button appearance
        button.textContent = 'Select';
        button.classList.remove('btn-success');
        button.classList.add('btn-outline-success');
    } else {
        // Add provider to selection
        selectedProviders.add(tin);
        
        // Update button appearance
        button.textContent = 'Selected';
        button.classList.remove('btn-outline-success');
        button.classList.add('btn-success');
    }
    
    // Update the selected providers list
    updateSelectedProvidersList();
    
    // Switch to selected providers mode if needed
    if (selectedProviders.size > 0) {
        const selectedProvidersRadio = document.getElementById('selectedProvidersRadio');
        if (selectedProvidersRadio) {
            selectedProvidersRadio.checked = true;
            
            // Trigger the change event
            const event = new Event('change');
            selectedProvidersRadio.dispatchEvent(event);
        }
    }
}

/**
 * Update the displayed list of selected providers
 */
function updateSelectedProvidersList() {
    const selectedProvidersList = document.getElementById('selectedProvidersList');
    if (!selectedProvidersList) return;
    
    // Clear the list
    selectedProvidersList.innerHTML = '';
    
    if (selectedProviders.size === 0) {
        selectedProvidersList.innerHTML = '<div class="alert alert-info">No providers selected</div>';
        return;
    }
    
    // Create a chip for each selected provider
    if (codeSummaryData && codeSummaryData.provider_summary) {
        selectedProviders.forEach(tin => {
            const providerData = codeSummaryData.provider_summary[tin];
            if (!providerData) return;
            
            const chip = document.createElement('div');
            chip.className = 'provider-chip';
            chip.innerHTML = `
                <span>${formatProviderName(providerData.name)}</span>
                <button class="provider-chip-remove" data-tin="${tin}">×</button>
            `;
            
            selectedProvidersList.appendChild(chip);
        });
    }
    
    // Add event listeners to remove buttons
    const removeButtons = selectedProvidersList.querySelectorAll('.provider-chip-remove');
    removeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tin = this.getAttribute('data-tin');
            removeProviderFromSelection(tin);
        });
    });
    
    // Update the update button state
    const updateRatesButton = document.getElementById('updateRatesButton');
    if (updateRatesButton) {
        updateRatesButton.disabled = selectedProviders.size === 0 && Object.keys(selectedCategories).length === 0;
    }
}

/**
 * Remove a provider from the selection
 * @param {string} tin - The provider TIN
 */
function removeProviderFromSelection(tin) {
    if (!selectedProviders.has(tin)) return;
    
    // Remove provider from selection
    selectedProviders.delete(tin);
    
    // Update the list
    updateSelectedProvidersList();
    
    // Update the button in the provider table
    const selectButton = document.querySelector(`.select-provider-btn[data-tin="${tin}"]`);
    if (selectButton) {
        selectButton.textContent = 'Select';
        selectButton.classList.remove('btn-success');
        selectButton.classList.add('btn-outline-success');
    }
    
    // If no providers are selected, switch back to all providers mode
    if (selectedProviders.size === 0) {
        const allProvidersRadio = document.getElementById('allProvidersRadio');
        if (allProvidersRadio) {
            allProvidersRadio.checked = true;
            
            // Trigger the change event
            const event = new Event('change');
            allProvidersRadio.dispatchEvent(event);
        }
    }
}

/**
 * Set up handlers for provider scope radio buttons
 */
function setupProviderScopeHandlers() {
    const scopeRadios = document.querySelectorAll('input[name="providerScope"]');
    const providerSelector = document.getElementById('providerSelector');
    
    scopeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'all') {
                // Hide provider selector
                if (providerSelector) {
                    providerSelector.style.display = 'none';
                }
            } else if (this.value === 'selected') {
                // Show provider selector
                if (providerSelector) {
                    providerSelector.style.display = 'block';
                }
            }
        });
    });
}

/**
 * Format a TIN with dashes for display
 * @param {string} tin - The TIN to format
 * @returns {string} - Formatted TIN (XX-XXXXXXX)
 */
function formatTIN(tin) {
    if (!tin || tin.length !== 9) return tin;
    return `${tin.substring(0, 2)}-${tin.substring(2)}`;
}

/**
 * Get the selected provider TINs based on the selection mode
 * @returns {Array} - Array of provider TINs
 */
function getSelectedProviderTINs() {
    const allProvidersRadio = document.getElementById('allProvidersRadio');
    
    if (allProvidersRadio && allProvidersRadio.checked) {
        // Return all provider TINs
        return codeSummaryData && codeSummaryData.provider_summary 
            ? Object.keys(codeSummaryData.provider_summary)
            : [];
    } else {
        // Return only selected provider TINs
        return Array.from(selectedProviders);
    }
}
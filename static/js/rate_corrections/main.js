/**
 * Main JavaScript functionality for the Rate Corrections tool
 * Handles initialization and core application flow
 */

// Create a global state object to avoid multiple declarations
window.RateCorrections = window.RateCorrections || {
    currentTIN: null,
    currentProviderName: null,
    currentProviderData: null,
    selectedCategories: {},
    allCategories: {},
    currentRates: []
};

/**
 * Set up global event listeners
 */
function setupGlobalEventListeners() {
    // Code search focusing
    const codeSearchInput = document.getElementById('codeSearchInput');
    if (codeSearchInput) {
        codeSearchInput.addEventListener('focus', function() {
            document.getElementById('distinctCodesList').scrollIntoView({ behavior: 'smooth' });
        });
    }
    
    // Highlight the currently selected tab
    const allTabs = document.querySelectorAll('.nav-link');
    allTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            allTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

/**
 * Set up provider management event listeners
 * Placeholder function to prevent reference error
 */
function setupProviderEventListeners() {
    console.log('Provider event listeners setup (placeholder)');
    // No specific event listeners needed for now
}

// Initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('Rate Corrections module initialized');
    
    // Set up global event listeners
    setupGlobalEventListeners();
    
    // Set up event listeners for buttons and controls
    setupEventListeners();
    
    // Load the list of TINs with rate failures
    loadTINs();
    
    // Load all available procedure categories
    loadCategories();
    
    // Load some default data for testing/demonstration
    loadDefaultData();
});

/**
 * Set up event listeners for the UI elements
 */
function setupEventListeners() {
    // Set up provider management event listeners
    setupProviderEventListeners();
    
    // Set up category pricing event listeners
    setupCategoryPricingEventListeners();
    
    // Resolution button event listeners
    const resolveButton = document.getElementById('resolveButton');
    if (resolveButton) {
        resolveButton.addEventListener('click', function() {
            showResolutionModal();
        });
    }
    
    // Confirm resolution button
    const confirmResolutionButton = document.getElementById('confirmResolutionButton');
    if (confirmResolutionButton) {
        confirmResolutionButton.addEventListener('click', function() {
            resolveRateFailures();
        });
    }
}

/**
 * Load default data for testing when the API isn't working
 */
function loadDefaultData() {
    console.log('Loading default data for testing');
    
    // Mock data for testing
    const mockData = {
        code_summary: {
            'MRI w/o': {
                count: 5,
                distinct_codes: ['70551', '72141', '73721'],
                providers_count: 2,
                providers: ['123456789', '987654321']
            },
            'CT w/o': {
                count: 3,
                distinct_codes: ['70450', '72125', '73700'],
                providers_count: 1,
                providers: ['123456789']
            }
        },
        provider_summary: {
            '123456789': {
                name: 'Test Provider',
                network: 'In Network',
                codes_count: 6,
                codes: ['70551', '72141', '73721', '70450', '72125', '73700']
            },
            '987654321': {
                name: 'Another Provider',
                network: 'Out of Network',
                codes_count: 3,
                codes: ['70551', '72141', '73721']
            }
        },
        total_missing: 8,
        distinct_codes_count: 6,
        distinct_codes: ['70551', '72141', '73721', '70450', '72125', '73700']
    };
    
    // Store the mock data globally
    window.codeSummaryData = mockData;
    
    // Call the display functions if they exist
    if (typeof displayCategorySummary === 'function') {
        displayCategorySummary(mockData.code_summary);
    }
    
    if (typeof displayDistinctCodes === 'function') {
        displayDistinctCodes(mockData.distinct_codes);
    }
    
    if (typeof displayProviderSummary === 'function') {
        displayProviderSummary(mockData.provider_summary);
    }
    
    if (typeof updateCountBadges === 'function') {
        updateCountBadges(mockData);
    }
}

/**
 * Show confirmation modal for resolving rate failures
 */
function showResolutionModal() {
    const state = window.RateCorrections;
    if (!state.currentTIN) {
        showAlert('No provider selected', 'warning');
        return;
    }
    
    // Show the modal
    const resolutionModal = new bootstrap.Modal(document.getElementById('resolutionModal'));
    resolutionModal.show();
}

/**
 * Resolve rate failures for the current TIN
 */
async function resolveRateFailures() {
    const state = window.RateCorrections;
    if (!state.currentTIN) {
        showAlert('No provider selected', 'warning');
        return;
    }
    
    try {
        // Get resolution notes
        const resolutionNotes = document.getElementById('resolutionNotes').value.trim();
        
        // Disable the confirm button
        const confirmButton = document.getElementById('confirmResolutionButton');
        confirmButton.disabled = true;
        confirmButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
        
        // Send request to resolve failures
        const response = await fetch('/rate_corrections/api/resolve', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                tin: state.currentTIN,
                action: 'category_update',
                details: {
                    updated_categories: Object.keys(state.selectedCategories),
                    resolution_notes: resolutionNotes
                }
            }),
        });
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // Hide the modal
        const resolutionModal = bootstrap.Modal.getInstance(document.getElementById('resolutionModal'));
        if (resolutionModal) {
            resolutionModal.hide();
        }
        
        // Show success message
        showAlert('Rate failures have been resolved successfully', 'success');
        
        // Reload TIN list
        loadTINs();
        
        // Reset current TIN and provider data
        state.currentTIN = null;
        state.currentProviderData = null;
        
        // Reset UI
        document.getElementById('providerInfo').innerHTML = '<div class="alert alert-info">Select a provider to view details</div>';
        document.getElementById('providerDetails').classList.add('d-none');
        document.getElementById('currentRatesTable').innerHTML = '';
        document.getElementById('ratesCount').textContent = '0';
        state.selectedCategories = {};
        updateSelectedCategoriesTable();
        
    } catch (error) {
        console.error('Error resolving rate failures:', error);
        showAlert(`Error resolving rate failures: ${error.message}`, 'error');
        
        // Reset button
        const confirmButton = document.getElementById('confirmResolutionButton');
        confirmButton.disabled = false;
        confirmButton.textContent = 'Mark as Resolved';
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
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
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
 * Format a date for display
 * @param {string} dateStr - The date string to format
 * @returns {string} - Formatted date
 */
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString();
    } catch (e) {
        return dateStr;
    }
}
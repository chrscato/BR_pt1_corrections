/**
 * Main JavaScript functionality for the Rate Corrections tool
 * Handles initialization and core application flow
 */

// Global variables for cross-module state
let currentTIN = null;
let currentProviderName = null;
let currentProviderData = null;
let selectedCategories = {};
let allCategories = {};
let currentRates = [];

// Initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('Rate Corrections module initialized');
    
    // Set up event listeners for buttons and controls
    setupEventListeners();
    
    // Load the list of TINs with rate failures
    loadTINs();
    
    // Load all available procedure categories
    loadCategories();
});

/**
 * Set up event listeners for all UI elements
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
 * Show confirmation modal for resolving rate failures
 */
function showResolutionModal() {
    if (!currentTIN) {
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
    if (!currentTIN) {
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
                tin: currentTIN,
                action: 'category_update',
                details: {
                    updated_categories: Object.keys(selectedCategories),
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
        currentTIN = null;
        currentProviderData = null;
        
        // Reset UI
        document.getElementById('providerInfo').innerHTML = '<div class="alert alert-info">Select a provider to view details</div>';
        document.getElementById('providerDetails').classList.add('d-none');
        document.getElementById('currentRatesTable').innerHTML = '';
        document.getElementById('ratesCount').textContent = '0';
        selectedCategories = {};
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
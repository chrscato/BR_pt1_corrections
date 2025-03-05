/**
 * Main JavaScript functionality for the Provider Corrections tool
 */

// Global variables
let currentProvider = null;
let updatedFields = {};

// Initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('Provider Corrections module initialized');
    
    // Set up event listeners for buttons and controls
    setupEventListeners();
    
    // Load the list of providers with missing fields
    loadProviders();
});

/**
 * Set up event listeners for the UI elements
 */
function setupEventListeners() {
    // Set up provider list event listeners
    setupProviderListEventListeners();
    
    // Set up provider editor event listeners
    setupProviderEditorEventListeners();
    
    // Search button
    const searchButton = document.getElementById('searchButton');
    if (searchButton) {
        searchButton.addEventListener('click', function() {
            searchProviders();
        });
    }
    
    // Search input (search on Enter)
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchProviders();
            }
        });
    }
    
    // Region tabs (load images when tab is selected)
    const regionTabs = document.querySelectorAll('#regionTabs .nav-link');
    if (regionTabs) {
        regionTabs.forEach(tab => {
            tab.addEventListener('shown.bs.tab', function(e) {
                // Get the tab id
                const tabId = e.target.id;
                
                // Get the selected file name
                const fileName = document.getElementById('selectedFileName').textContent;
                if (fileName === 'No file selected') {
                    return;
                }
                
                // Load the appropriate region or PDF
                if (tabId === 'header-tab') {
                    loadPDFRegion(fileName, 'header', 'headerImage');
                } else if (tabId === 'footer-tab') {
                    loadPDFRegion(fileName, 'footer', 'footerImage');
                } else if (tabId === 'full-tab') {
                    loadPDF(fileName);
                }
            });
        });
    }
}

/**
 * Format a TIN with dashes for display
 * @param {string} tin - The TIN to format
 * @returns {string} - Formatted TIN (XX-XXXXXXX)
 */
function formatTIN(tin) {
    if (!tin) return '';
    
    // Clean TIN
    const cleanTIN = tin.replace(/\D/g, '');
    
    if (cleanTIN.length !== 9) return tin;
    
    return `${cleanTIN.substring(0, 2)}-${cleanTIN.substring(2)}`;
}

/**
 * Format an NPI for display
 * @param {string} npi - The NPI to format
 * @returns {string} - Formatted NPI
 */
function formatNPI(npi) {
    if (!npi) return '';
    
    // Clean NPI
    return npi.replace(/\D/g, '');
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
 * Reset the form fields and related state
 */
function resetForm() {
    // Reset current provider
    currentProvider = null;
    
    // Reset updated fields
    updatedFields = {};
    
    // Hide provider editor
    document.getElementById('providerEditor').classList.add('d-none');
    
    // Reset provider info
    document.getElementById('providerInfo').innerHTML = `
        <div class="alert alert-info">
            Select a provider to edit information
        </div>
    `;
    
    // Clear form fields
    document.getElementById('primaryKey').value = '';
    document.getElementById('dbaName').value = '';
    document.getElementById('billingName').value = '';
    document.getElementById('tin').value = '';
    document.getElementById('npi').value = '';
    document.getElementById('billingAddress1').value = '';
    document.getElementById('billingAddress2').value = '';
    document.getElementById('billingCity').value = '';
    document.getElementById('billingState').value = '';
    document.getElementById('billingZip').value = '';
    document.getElementById('providerType').value = '';
    document.getElementById('providerStatus').value = '';
    document.getElementById('providerNetwork').value = '';
    
    // Clear related files
    document.getElementById('relatedFilesTable').innerHTML = `
        <tr>
            <td colspan="5" class="text-center">No related files found</td>
        </tr>
    `;
    document.getElementById('filesCount').textContent = '0';
    
    // Reset selected file name
    document.getElementById('selectedFileName').textContent = 'No file selected';
    
    // Reset PDF viewer
    document.getElementById('pdfFrame').src = 'about:blank';
    document.getElementById('headerImage').src = '';
    document.getElementById('footerImage').src = '';
    
    // Reset search results
    document.getElementById('searchResultsCard').classList.add('d-none');
    document.getElementById('searchResults').innerHTML = '';
}
/**
 * Code Summary functionality for the Rate Corrections tool
 * Handles loading and displaying CPT code summaries
 */

// Global variables for cross-module state
let codeSummaryData = null;
let selectedCategory = null;
let filteredCodes = [];

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', function() {
    // Set up event handlers for code filtering
    setupCodeFilterHandlers();
    
    // Load actual data from the API
    loadCodeSummary();
});

/**
 * Load the summary of missing CPT codes
 */
async function loadCodeSummary() {
    try {
        console.log('Loading missing CPT codes summary...');
        
        const response = await fetch('/rate_corrections/api/missing_codes_summary');
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Store globally
        codeSummaryData = data;
        window.codeSummaryData = data;
        
        console.log('Loaded real code summary data:', data);
        
        // Update UI with the data
        displayCategorySummary(data.code_summary);
        displayDistinctCodes(data.distinct_codes);
        
        // Call provider summary display if the function exists
        if (typeof displayProviderSummary === 'function') {
            displayProviderSummary(data.provider_summary);
        } else {
            console.warn('displayProviderSummary function not found');
        }
        
        // Update count badges
        updateCountBadges(data);
        
    } catch (error) {
        console.error('Error loading code summary:', error);
        showAlert(`Error loading code summary: ${error.message}`, 'error');
        
        // Fallback to mock data if the endpoint fails
        loadDefaultCodeSummaryData();
    }
}
/**
 * Display the category summary in the table
 * @param {Object} categorySummary - The category summary data
 */
function displayCategorySummary(categorySummary) {
    const table = document.getElementById('categorySummaryTable');
    
    if (!table) {
        console.error('Category summary table element not found');
        return;
    }
    
    // Clear table
    table.innerHTML = '';
    
    if (!categorySummary || Object.keys(categorySummary).length === 0) {
        table.innerHTML = '<tr><td colspan="4" class="text-center">No missing rates found</td></tr>';
        return;
    }
    
    // Sort categories by number of missing codes (highest first)
    const sortedCategories = Object.entries(categorySummary)
        .sort((a, b) => b[1].distinct_codes.length - a[1].distinct_codes.length);
    
    // Create table rows
    sortedCategories.forEach(([category, data]) => {
        // Skip if no missing codes
        if (!data.distinct_codes || data.distinct_codes.length === 0) return;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${category}</td>
            <td>${data.distinct_codes.length}</td>
            <td>${data.providers_count || 0}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary view-category-btn" 
                        data-category="${category}">
                    View
                </button>
            </td>
        `;
        
        table.appendChild(row);
    });
    
    // Add event listeners to the view buttons
    const viewButtons = table.querySelectorAll('.view-category-btn');
    viewButtons.forEach(button => {
        button.addEventListener('click', function() {
            const category = this.getAttribute('data-category');
            viewCategoryDetails(category);
        });
    });
    
    console.log('Category summary displayed successfully');
}

/**
 * Display the distinct CPT codes needing rates
 * @param {Array} distinctCodes - Array of distinct CPT codes
 */
function displayDistinctCodes(distinctCodes) {
    const codesContainer = document.getElementById('distinctCodesList');
    
    if (!codesContainer) {
        console.error('Distinct codes container element not found');
        return;
    }
    
    // Clear container
    codesContainer.innerHTML = '';
    
    if (!distinctCodes || distinctCodes.length === 0) {
        codesContainer.innerHTML = '<div class="alert alert-info">No missing CPT codes found</div>';
        return;
    }
    
    // Store globally for filtering
    filteredCodes = [...distinctCodes];
    
    // Display codes as chips
    displayCodeChips(codesContainer, distinctCodes);
    
    console.log(`Displayed ${distinctCodes.length} distinct CPT codes`);
}

/**
 * Display CPT codes as clickable chips
 * @param {HTMLElement} container - The container element
 * @param {Array} codes - Array of CPT codes
 */
function displayCodeChips(container, codes) {
    // Clear container
    container.innerHTML = '';
    
    if (!codes || codes.length === 0) {
        container.innerHTML = '<div class="alert alert-info">No codes to display</div>';
        return;
    }
    
    codes.forEach(code => {
        const chip = document.createElement('span');
        chip.className = 'code-chip';
        chip.textContent = code;
        chip.setAttribute('data-cpt', code);
        
        // Add click event to view code details
        chip.addEventListener('click', function() {
            const cptCode = this.getAttribute('data-cpt');
            viewCodeDetails(cptCode);
        });
        
        container.appendChild(chip);
    });
}

/**
 * Update the count badges with summary data
 * @param {Object} data - The summary data
 */
function updateCountBadges(data) {
    // Update total missing codes count
    const totalMissingCount = document.getElementById('totalMissingCount');
    if (totalMissingCount) {
        totalMissingCount.textContent = data.distinct_codes_count || 0;
    }
    
    // Update distinct codes count
    const distinctCodesCount = document.getElementById('distinctCodesCount');
    if (distinctCodesCount) {
        distinctCodesCount.textContent = data.distinct_codes_count || 0;
    }
    
    // Update providers count
    const providersCount = document.getElementById('providersCount');
    if (providersCount) {
        providersCount.textContent = Object.keys(data.provider_summary || {}).length || 0;
    }
    
    console.log('Updated count badges with summary data');
}

/**
 * Set up event handlers for code filtering
 */
function setupCodeFilterHandlers() {
    // Search button click
    const searchButton = document.getElementById('searchCodeBtn');
    if (searchButton) {
        searchButton.addEventListener('click', filterCodes);
    }
    
    // Search input enter key
    const searchInput = document.getElementById('codeSearchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                filterCodes();
            }
        });
    }
    
    console.log('Code filter handlers set up');
}

/**
 * Filter the displayed CPT codes based on search input
 */
function filterCodes() {
    if (!codeSummaryData || !codeSummaryData.distinct_codes) return;
    
    const searchInput = document.getElementById('codeSearchInput');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.trim().toUpperCase();
    const codesContainer = document.getElementById('distinctCodesList');
    
    if (!searchTerm) {
        // Reset to show all codes
        filteredCodes = [...codeSummaryData.distinct_codes];
        displayCodeChips(codesContainer, filteredCodes);
        return;
    }
    
    // Filter codes that include the search term
    filteredCodes = codeSummaryData.distinct_codes.filter(code => 
        code.includes(searchTerm)
    );
    
    // Display filtered codes
    displayCodeChips(codesContainer, filteredCodes);
    
    console.log(`Filtered codes to ${filteredCodes.length} results matching "${searchTerm}"`);
}

/**
 * View details for a specific category
 * @param {string} category - The category name
 */
function viewCategoryDetails(category) {
    console.log(`Viewing details for category: ${category}`);
    
    // Mark as selected category
    selectedCategory = category;
    
    // Update category detail header
    const categoryDetailHeader = document.getElementById('categoryDetailHeader');
    if (categoryDetailHeader) {
        categoryDetailHeader.textContent = `Category: ${category}`;
    }
    
    // Show category details section
    const categoryDetails = document.getElementById('categoryDetails');
    if (categoryDetails) {
        categoryDetails.classList.remove('d-none');
    }
    
    // Hide the info alert
    const categoryInfo = document.getElementById('categoryInfo');
    if (categoryInfo) {
        categoryInfo.style.display = 'none';
    }
    
    // Update category title and description
    const categoryTitle = document.getElementById('categoryTitle');
    if (categoryTitle) {
        categoryTitle.textContent = category;
    }
    
    const categoryDescription = document.getElementById('categoryDescription');
    if (categoryDescription) {
        categoryDescription.textContent = `This category includes procedures for ${category.toLowerCase()}.`;
    }
    
    // Get missing codes for this category
    let missingCodes = [];
    if (codeSummaryData && codeSummaryData.code_summary && 
        codeSummaryData.code_summary[category]) {
        missingCodes = codeSummaryData.code_summary[category].distinct_codes;
    }
    
    // Display missing codes
    const categoryMissingCodes = document.getElementById('categoryMissingCodes');
    if (categoryMissingCodes) {
        displayCodeChips(categoryMissingCodes, missingCodes);
    }
    
    // Load all codes in this category
    const allCodesElement = document.getElementById('categoryAllCodes');
    if (allCodesElement) {
        // For now, use the same codes until the real data is available
        displayCodeChips(allCodesElement, missingCodes);
    }
    
    // Highlight this category in the table
    highlightCategoryRow(category);
    
    // Select this category in the rate setting section if the function exists
    if (typeof selectCategoryForRateSetting === 'function') {
        selectCategoryForRateSetting(category);
    } else {
        // Try to select the category in the dropdown manually
        const categorySelect = document.getElementById('categorySelect');
        if (categorySelect) {
            for (let i = 0; i < categorySelect.options.length; i++) {
                if (categorySelect.options[i].value === category) {
                    categorySelect.selectedIndex = i;
                    
                    // Trigger change event
                    const event = new Event('change');
                    categorySelect.dispatchEvent(event);
                    break;
                }
            }
        }
    }
}

/**
 * Highlight the selected category row in the table
 * @param {string} category - The category name
 */
function highlightCategoryRow(category) {
    // Remove highlight from all rows
    const allRows = document.querySelectorAll('#categorySummaryTable tr');
    allRows.forEach(row => {
        row.classList.remove('table-primary');
    });
    
    // Add highlight to the selected category row
    allRows.forEach(row => {
        const categoryCell = row.cells && row.cells[0];
        if (categoryCell && categoryCell.textContent === category) {
            row.classList.add('table-primary');
        }
    });
}

/**
 * View details for a specific CPT code
 * @param {string} cptCode - The CPT code
 */
function viewCodeDetails(cptCode) {
    console.log(`Viewing details for CPT code: ${cptCode}`);
    
    // Find which categories this code belongs to
    let codeCategories = [];
    
    if (codeSummaryData && codeSummaryData.code_summary) {
        for (const [category, data] of Object.entries(codeSummaryData.code_summary)) {
            if (data.distinct_codes && data.distinct_codes.includes(cptCode)) {
                codeCategories.push(category);
            }
        }
    }
    
    // Show details in an alert
    const alertType = codeCategories.length > 0 ? 'info' : 'warning';
    const categoryList = codeCategories.length > 0 
        ? codeCategories.map(c => `<span class="badge bg-secondary">${c}</span>`).join(' ')
        : '<span class="text-warning">No specific category found</span>';
    
    showAlert(`
        <strong>CPT Code: ${cptCode}</strong><br>
        Categories: ${categoryList}<br>
        <button class="btn btn-sm btn-outline-primary mt-2" onclick="addCodeToSearch('${cptCode}')">
            Add to Search
        </button>
    `, alertType, 5000, true);
}

/**
 * Add a CPT code to the search input
 * @param {string} cptCode - The CPT code to add
 */
function addCodeToSearch(cptCode) {
    const searchInput = document.getElementById('codeSearchInput');
    if (!searchInput) return;
    
    searchInput.value = cptCode;
    filterCodes();
}

/**
 * Show an alert message that automatically disappears
 * @param {string} message - The message to display
 * @param {string} type - Alert type ('success', 'error', 'info', 'warning')
 * @param {number} duration - Duration in milliseconds
 * @param {boolean} html - Whether the message contains HTML
 */
function showAlert(message, type = 'success', duration = 3000, html = false) {
    // Create the alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    
    // Add the message
    if (html) {
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
    } else {
        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;
        alertDiv.appendChild(messageSpan);
        
        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'btn-close';
        closeButton.setAttribute('data-bs-dismiss', 'alert');
        closeButton.setAttribute('aria-label', 'Close');
        alertDiv.appendChild(closeButton);
    }
    
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

// Make functions available globally
window.displayCodeChips = displayCodeChips;
window.viewCategoryDetails = viewCategoryDetails;
window.addCodeToSearch = addCodeToSearch;
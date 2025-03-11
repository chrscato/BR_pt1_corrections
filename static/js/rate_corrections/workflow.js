/**
 * Show the guided workflow options
 */
function showGuidedWorkflow() {
    // Hide other sections
    document.getElementById('missingCodesSection').classList.add('d-none');
    document.getElementById('categorySettingSection').classList.add('d-none');
    
    // Show the guided workflow section
    const guidedWorkflow = document.getElementById('guidedWorkflow');
    guidedWorkflow.classList.remove('d-none');
    
    // Update status
    updateWorkflowStatus('Select a workflow option', 0);
}

/**
 * Show the individual codes section
 */
function showIndividualCodes() {
    // Hide other sections
    document.getElementById('guidedWorkflow').classList.add('d-none');
    document.getElementById('categorySettingSection').classList.add('d-none');
    
    // Show the missing codes section
    document.getElementById('missingCodesSection').classList.remove('d-none');
    
    // Update status
    updateWorkflowStatus('Setting individual code rates', 30);
}

/**
 * Show the category setting section
 */
function showCategorySetting() {
    // Hide other sections
    document.getElementById('guidedWorkflow').classList.add('d-none');
    document.getElementById('missingCodesSection').classList.add('d-none');
    
    // Show the category setting section
    document.getElementById('categorySettingSection').classList.remove('d-none');
    
    // Update status
    updateWorkflowStatus('Setting category-based rates', 30);
    
    // Load categories specific to this provider
    loadProviderCategories();
}

/**
 * Update the workflow progress status
 * @param {string} status - Status text to display
 * @param {number} percentage - Progress percentage (0-100)
 */
function updateWorkflowStatus(status, percentage) {
    const workflowProgress = document.getElementById('workflowProgress');
    const workflowProgressBar = document.getElementById('workflowProgressBar');
    const workflowStatus = document.getElementById('workflowStatus');
    
    if (!workflowProgress || !workflowProgressBar || !workflowStatus) return;
    
    // Show progress section
    workflowProgress.classList.remove('d-none');
    
    // Update progress bar
    workflowProgressBar.style.width = `${percentage}%`;
    workflowProgressBar.setAttribute('aria-valuenow', percentage);
    
    // Update status text
    workflowStatus.textContent = status;
}

/**
 * Load categories specific to the current provider
 */
function loadProviderCategories() {
    const currentData = window.RateCorrections.currentProviderData;
    
    if (!currentData || !currentData.failures) {
        console.warn('No provider data available');
        return;
    }
    
    // Extract categories from the failures
    const providerCategories = new Set();
    
    currentData.failures.forEach(failure => {
        if (failure.rates && Array.isArray(failure.rates)) {
            failure.rates.forEach(rate => {
                if (rate.category) {
                    providerCategories.add(rate.category);
                }
            });
        }
    });
    
    // Get the category select dropdown
    const categorySelect = document.getElementById('categorySelect');
    if (!categorySelect) return;
    
    // Clear existing options (except the first one)
    while (categorySelect.options.length > 1) {
        categorySelect.remove(1);
    }
    
    // Add categories from the provider data
    [...providerCategories].sort().forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });
    
    // Also add all categories from global data
    const allCategories = window.RateCorrections.allCategories;
    if (allCategories) {
        Object.keys(allCategories).sort().forEach(category => {
            // Skip if already added
            if (providerCategories.has(category)) return;
            
            const option = document.createElement('option');
            option.value = category;
            option.textContent = `${category} (All)`;
            categorySelect.appendChild(option);
        });
    }
}

/**
 * When a TIN is loaded, show the guided workflow
 * @param {Object} data - The provider data
 */
function enhancedRenderProviderDetails(data) {
    // First call the original function
    renderProviderDetails(data);
    
    // Then show the guided workflow
    const guidedWorkflow = document.getElementById('guidedWorkflow');
    if (guidedWorkflow) {
        guidedWorkflow.classList.remove('d-none');
    }
    
    // Reset workflow progress
    updateWorkflowStatus('Select a workflow option', 0);
}

// Override the renderProviderDetails function with our enhanced version
window.originalRenderProviderDetails = window.renderProviderDetails || function() {};
window.renderProviderDetails = enhancedRenderProviderDetails;

// Export functions to the global scope
window.showGuidedWorkflow = showGuidedWorkflow;
window.showIndividualCodes = showIndividualCodes;
window.showCategorySetting = showCategorySetting;
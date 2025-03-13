/**
 * Rate Corrections Workflow Management
 */
class RateCorrectionWorkflow {
    constructor() {
        // Current workflow state
        this.state = {
            provider: null,
            correctionType: null,
            lineItems: [],
            categoryRates: {},
            errors: []
        };

        // UI Elements
        this.elements = {
            providerDetailContent: document.getElementById('providerDetailContent'),
            confirmationModal: new bootstrap.Modal(document.getElementById('confirmationModal')),
            confirmActionButton: document.getElementById('confirmActionButton'),
            confirmationModalBody: document.getElementById('confirmationModalBody')
        };
    }

    /**
     * Trigger the correction workflow
     * @param {Object} provider - Selected provider details
     * @param {string} correctionType - Type of correction ('line-item' or 'category')
     */
    initWorkflow(provider, correctionType) {
        // Reset state
        this.state = {
            provider: provider,
            correctionType: correctionType,
            lineItems: [],
            categoryRates: {},
            errors: []
        };

        // Render appropriate workflow
        if (correctionType === 'line-item') {
            this.renderLineItemCorrection();
        } else if (correctionType === 'category') {
            this.renderCategoryCorrection();
        }
    }

    /**
     * Render line item correction interface
     */
    renderLineItemCorrection() {
        const { details } = this.state.provider;
        const missingRateItems = details.missing_rate_items || [];

        // Prepare line items for correction
        this.state.lineItems = missingRateItems.map(item => ({
            ...item,
            suggestedRate: null,
            suggestedCategory: item.current_category
        }));

        // Generate HTML for line item correction
        this.elements.providerDetailContent.innerHTML = `
            <div class="line-item-correction-container">
                <h3>Line Item Rate Corrections: ${this.state.provider.name}</h3>
                <div class="alert alert-info">
                    Remaining corrections: <span id="remainingCorrections">${this.state.lineItems.length}</span>
                </div>
                <table class="table table-bordered table-hover">
                    <thead>
                        <tr>
                            <th>CPT Code</th>
                            <th>Description</th>
                            <th>Current Category</th>
                            <th>Rate</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody id="lineItemsCorrectionBody">
                        ${this.state.lineItems.map((item, index) => `
                            <tr id="line-item-${index}">
                                <td>${item.cpt_code}</td>
                                <td>${item.description}</td>
                                <td>
                                    <select class="form-select form-select-sm category-select" data-index="${index}">
                                        <option>${item.current_category}</option>
                                        ${this.generateCategoryOptions(item.current_category)}
                                    </select>
                                </td>
                                <td>
                                    <input 
                                        type="number" 
                                        class="form-control form-control-sm rate-input" 
                                        data-index="${index}" 
                                        placeholder="Enter rate"
                                        step="0.01" 
                                        min="0"
                                    >
                                </td>
                                <td>
                                    <button class="btn btn-sm btn-primary save-line-item" data-index="${index}">
                                        Save
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="d-grid">
                    <button id="saveAllLineItemsBtn" class="btn btn-success">
                        Save All Line Items
                    </button>
                </div>
            </div>
        `;

        // Attach event listeners
        this.attachLineItemEventListeners();
    }

    /**
     * Attach event listeners for line item correction
     */
    attachLineItemEventListeners() {
        const lineItemBody = document.getElementById('lineItemsCorrectionBody');
        
        // Individual line item save
        lineItemBody.addEventListener('click', (e) => {
            if (e.target.classList.contains('save-line-item')) {
                const index = e.target.getAttribute('data-index');
                this.saveIndividualLineItem(parseInt(index));
            }
        });

        // Category select change
        lineItemBody.addEventListener('change', (e) => {
            if (e.target.classList.contains('category-select')) {
                const index = e.target.getAttribute('data-index');
                this.state.lineItems[index].suggestedCategory = e.target.value;
            }
        });

        // Rate input change
        lineItemBody.addEventListener('input', (e) => {
            if (e.target.classList.contains('rate-input')) {
                const index = e.target.getAttribute('data-index');
                this.state.lineItems[index].suggestedRate = parseFloat(e.target.value);
            }
        });

        // Save all line items button
        const saveAllBtn = document.getElementById('saveAllLineItemsBtn');
        saveAllBtn.addEventListener('click', () => this.saveAllLineItems());
    }

    /**
     * Save an individual line item
     * @param {number} index - Index of the line item
     */
    saveIndividualLineItem(index) {
        const lineItem = this.state.lineItems[index];
        const rateInput = document.querySelector(`.rate-input[data-index="${index}"]`);
        const row = document.getElementById(`line-item-${index}`);

        // Validate line item
        if (!lineItem.suggestedRate || lineItem.suggestedRate <= 0) {
            this.showAlert('Please enter a valid rate', 'warning');
            rateInput.classList.add('is-invalid');
            return;
        }

        // Prepare data for save
        const saveData = {
            cpt_code: lineItem.cpt_code,
            rate: lineItem.suggestedRate,
            category: lineItem.suggestedCategory
        };

        // Perform save
        this.saveLineItemToServer(saveData)
            .then(() => {
                // Remove item from state
                this.state.lineItems.splice(index, 1);
                
                // Remove the row with animation
                row.style.transition = 'opacity 0.5s';
                row.style.opacity = '0';
                
                setTimeout(() => {
                    row.remove();
                    document.getElementById('remainingCorrections').textContent = this.state.lineItems.length;
                }, 500);
                
                this.showAlert(`Saved rate for ${lineItem.cpt_code}`, 'success');
            })
            .catch(error => {
                this.showAlert(`Failed to save: ${error.message}`, 'danger');
                rateInput.classList.add('is-invalid');
            });
    }

    /**
     * Save all line items
     */
    saveAllLineItems() {
        // Validate all line items
        const invalidItems = this.state.lineItems.filter(
            item => !item.suggestedRate || item.suggestedRate <= 0
        );

        if (invalidItems.length > 0) {
            this.showAlert('Please fill in rates for all line items', 'warning');
            return;
        }

        // Prepare save data
        const saveData = this.state.lineItems.map(item => ({
            cpt_code: item.cpt_code,
            rate: item.suggestedRate,
            category: item.suggestedCategory
        }));

        // Perform bulk save
        this.saveLineItemsToServer(saveData)
            .then(result => {
                if (result.total_successful > 0) {
                    // Clear all items from state
                    this.state.lineItems = [];
                    
                    // Clear the table body
                    const tbody = document.getElementById('lineItemsCorrectionBody');
                    tbody.innerHTML = '';
                    document.getElementById('remainingCorrections').textContent = '0';
                    
                    this.showAlert(`Saved ${result.total_successful} of ${result.total_processed} line items`, 'success');
                }
            })
            .catch(error => {
                this.showAlert(`Bulk save failed: ${error.message}`, 'danger');
            });
    }

    /**
     * Render category-based correction interface
     */
    renderCategoryCorrection() {
        const { details } = this.state.provider;
        
        // Generate initial category rate suggestions
        this.state.categoryRates = this.generateCategoryRateSuggestions(details);

        // Generate HTML for category correction
        this.elements.providerDetailContent.innerHTML = `
            <div class="category-correction-container">
                <h3>Category-Based Rate Corrections: ${this.state.provider.name}</h3>
                <table class="table table-bordered table-hover">
                    <thead>
                        <tr>
                            <th>Category</th>
                            <th>Total CPT Codes</th>
                            <th>Suggested Rate</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody id="categoryCorrectionBody">
                        ${Object.entries(this.state.categoryRates).map(([category, rate]) => `
                            <tr>
                                <td>${category}</td>
                                <td>${details.possible_categories[category]?.total_codes || 0}</td>
                                <td>
                                    <div class="input-group">
                                        <span class="input-group-text">$</span>
                                        <input 
                                            type="number" 
                                            class="form-control form-control-sm category-rate-input" 
                                            data-category="${category}" 
                                            value="${rate.toFixed(2)}"
                                            step="0.01" 
                                            min="0"
                                        >
                                    </div>
                                </td>
                                <td>
                                    <button class="btn btn-sm btn-primary apply-category-rate" data-category="${category}">
                                        Apply
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="d-grid">
                    <button id="saveAllCategoryRatesBtn" class="btn btn-success">
                        Save All Category Rates
                    </button>
                </div>
            </div>
        `;

        // Attach event listeners
        this.attachCategoryRateEventListeners();
    }

    /**
     * Attach event listeners for category rate correction
     */
    attachCategoryRateEventListeners() {
        const categoryBody = document.getElementById('categoryCorrectionBody');
        
        // Category rate input change
        categoryBody.addEventListener('input', (e) => {
            if (e.target.classList.contains('category-rate-input')) {
                const category = e.target.getAttribute('data-category');
                const rate = parseFloat(e.target.value);
                this.state.categoryRates[category] = rate;
            }
        });

        // Apply individual category rate
        categoryBody.addEventListener('click', (e) => {
            if (e.target.classList.contains('apply-category-rate')) {
                const category = e.target.getAttribute('data-category');
                this.applyCategoryRate(category);
            }
        });

        // Save all category rates
        const saveAllBtn = document.getElementById('saveAllCategoryRatesBtn');
        saveAllBtn.addEventListener('click', () => this.saveAllCategoryRates());
    }

    /**
     * Apply rate for a specific category
     * @param {string} category - Category to apply rate to
     */
    applyCategoryRate(category) {
        const rate = this.state.categoryRates[category];
        
        if (!rate || rate <= 0) {
            this.showAlert('Please enter a valid rate', 'warning');
            return;
        }

        // Confirm category rate application
        this.showConfirmationModal(
            `Apply ${category} category rate of $${rate.toFixed(2)}`,
            () => this.saveCategoryRateToServer(category, rate)
        );
    }

    /**
     * Save all category rates
     */
    saveAllCategoryRates() {
        // Validate rates
        const invalidCategories = Object.entries(this.state.categoryRates)
            .filter(([, rate]) => !rate || rate <= 0);

        if (invalidCategories.length > 0) {
            this.showAlert('Please enter valid rates for all categories', 'warning');
            return;
        }

        // Confirm bulk category rate save
        this.showConfirmationModal(
            `Save rates for ${Object.keys(this.state.categoryRates).length} categories`,
            () => this.saveCategoryRatesToServer(this.state.categoryRates)
        );
    }

    /**
     * Generate category options for select
     * @param {string} currentCategory - Current category
     * @returns {string} HTML options
     */
    generateCategoryOptions(currentCategory) {
        const categories = Object.keys(this.state.provider.details.possible_categories || {})
            .filter(cat => cat !== currentCategory);
        
        return categories.map(cat => `<option>${cat}</option>`).join('');
    }

    /**
     * Generate category rate suggestions
     * @param {Object} providerDetails - Provider details
     * @returns {Object} Suggested category rates
     */
    generateCategoryRateSuggestions(providerDetails) {
        const suggestions = {};
        const possibleCategories = providerDetails.possible_categories || {};
        const currentRates = providerDetails.current_rates || [];

        Object.keys(possibleCategories).forEach(category => {
            // Find existing rates for this category
            const categoryRates = currentRates.filter(
                rate => rate.proc_category === category
            );

            if (categoryRates.length > 0) {
                // Use most common rate
                const rateFrequency = {};
                categoryRates.forEach(rate => {
                    rateFrequency[rate.rate] = (rateFrequency[rate.rate] || 0) + 1;
                });

                const mostCommonRate = Object.entries(rateFrequency).reduce(
                    (a, b) => b[1] > a[1] ? b : a
                )[0];

                suggestions[category] = parseFloat(mostCommonRate);
            } else {
                // Default suggestion
                suggestions[category] = 500.00;
            }
        });

        return suggestions;
    }

    /**
     * Show confirmation modal
     * @param {string} message - Confirmation message
     * @param {Function} confirmAction - Action to perform on confirm
     */
    showConfirmationModal(message, confirmAction) {
        this.elements.confirmationModalBody.innerHTML = message;
        
        // Remove previous listeners to prevent multiple calls
        this.elements.confirmActionButton.onclick = null;
        
        // Add new listener
        this.elements.confirmActionButton.onclick = () => {
            confirmAction();
            this.elements.confirmationModal.hide();
        };

        this.elements.confirmationModal.show();
    }

    /**
     * Save a single line item to the server
     * @param {Object} lineItem - Line item to save
     * @returns {Promise} Save result
     */
    async saveLineItemToServer(lineItem) {
        try {
            const response = await fetch('/rate_corrections/api/corrections/line-items', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tin: this.state.provider.tin,
                    line_items: [lineItem]
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save line item');
            }

            const result = await response.json();
            
            // Refresh provider details after successful save
            if (window.RateCorrections && window.RateCorrections.selectProvider) {
                await window.RateCorrections.selectProvider(this.state.provider);
            }
            
            return result;
        } catch (error) {
            console.error('Line item save error:', error);
            throw error;
        }
    }

    /**
     * Save multiple line items to the server
     * @param {Array} lineItems - Line items to save
     * @returns {Promise} Save result
     */
    async saveLineItemsToServer(lineItems) {
        try {
            const response = await fetch('/rate_corrections/api/corrections/line-items', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tin: this.state.provider.tin,
                    line_items: lineItems
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save line items');
            }

            return await response.json();
        } catch (error) {
            console.error('Line items save error:', error);
            throw error;
        }
    }

    /**
     * Save a category rate to the server
     * @param {string} category - Category to save
     * @param {number} rate - Rate for the category
     * @returns {Promise} Save result
     */
    async saveCategoryRateToServer(category, rate) {
        try {
            const response = await fetch('/rate_corrections/api/corrections/category', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tin: this.state.provider.tin,
                    category_rates: {
                        [category]: rate
                    }
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save category rate');
            }

            const result = await response.json();
            
            // Refresh provider details after successful save
            if (window.RateCorrections && window.RateCorrections.selectProvider) {
                await window.RateCorrections.selectProvider(this.state.provider);
            }
            
            this.showAlert(`Successfully applied ${category} category rate`, 'success');
            return result;
        } catch (error) {
            console.error('Category rate save error:', error);
            this.showAlert(`Failed to save ${category} category rate`, 'danger');
            throw error;
        }
    }

    /**
     * Save all category rates to the server
     * @param {Object} categoryRates - Category rates to save
     * @returns {Promise} Save result
     */
    async saveCategoryRatesToServer(categoryRates) {
        try {
            const response = await fetch('/rate_corrections/api/corrections/category', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tin: this.state.provider.tin,
                    category_rates: categoryRates
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save category rates');
            }

            const result = await response.json();
            this.showAlert(`Successfully saved rates for ${Object.keys(categoryRates).length} categories`, 'success');
            return result;
        } catch (error) {
            console.error('Category rates save error:', error);
            this.showAlert('Failed to save category rates', 'danger');
            throw error;
        }
    }

    /**
     * Show an alert message
     * @param {string} message - Message to display
     * @param {string} type - Alert type (success, danger, warning, info)
     */
    showAlert(message, type = 'info') {
        const alertContainer = document.createElement('div');
        alertContainer.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
        alertContainer.setAttribute('role', 'alert');
        
        alertContainer.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;

        document.body.appendChild(alertContainer);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            alertContainer.classList.remove('show');
            setTimeout(() => alertContainer.remove(), 150);
        }, 5000);
    }
}

// Global function to trigger workflow from main application
window.triggerCorrectionWorkflow = (provider, correctionType) => {
    const workflow = new RateCorrectionWorkflow();
    workflow.initWorkflow(provider, correctionType);
};

export default RateCorrectionWorkflow;
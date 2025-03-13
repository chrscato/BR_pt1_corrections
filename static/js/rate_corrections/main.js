/**
 * Rate Corrections Main Application Logic
 */
window.RateCorrections = window.RateCorrections || {
    providers: [],
    selectedProvider: null,
    metrics: {
        totalProviders: 0,
        missingRateLineItems: 0,
        missingCategoryCodes: 0,
        totalCPTCodes: 0
    },
    currentTIN: null,
    currentProviderName: null,
    selectedCategories: {}
};

class RateCorrectionsApp {
    constructor() {
        this.state = window.RateCorrections;
        // View management
        this.views = {
            dashboard: document.getElementById('dashboardMetricsPanel'),
            providerDetails: document.getElementById('providerDetailsPanel'),
            dashboardViewBtn: document.getElementById('dashboardViewBtn'),
            providerDetailViewBtn: document.getElementById('providerDetailViewBtn'),
            correctionWorkflowBtn: document.getElementById('correctionWorkflowBtn')
        };

        // Initialize event listeners
        this.initEventListeners();
        
        // Make selectProvider available globally
        window.RateCorrections.selectProvider = this.selectProvider.bind(this);
    }

    /**
     * Initialize application event listeners
     */
    initEventListeners() {
        // View switching
        this.views.dashboardViewBtn.addEventListener('click', () => this.switchToDashboardView());
        this.views.providerDetailViewBtn.addEventListener('click', () => this.switchToProviderDetailView());
        this.views.correctionWorkflowBtn.addEventListener('click', () => this.switchToCorrectionWorkflow());
    }

    /**
     * Fetch and display initial dashboard metrics
     */
    // Fix the loadDashboardMetrics function
    async loadDashboardMetrics() {
        try {
            const response = await fetch('/rate_corrections/api/providers/missing-rates');
            
            if (!response.ok) {
                throw new Error(`Failed to fetch providers: ${response.status} ${response.statusText}`);
            }

            const providers = await response.json();
            
            // Update state
            this.state.providers = providers;
            this.state.metrics.totalProviders = providers.length;
            
            // Calculate metrics
            let missingRateLineItems = 0;
            let missingCategoryCodes = 0;
            let totalCPTCodes = 0;

            providers.forEach(provider => {
                missingRateLineItems += provider.missing_rate_line_items || 0;
                missingCategoryCodes += provider.missing_category_line_items || 0;
                totalCPTCodes += (provider.cpt_codes || []).length;
            });

            this.state.metrics.missingRateLineItems = missingRateLineItems;
            this.state.metrics.missingCategoryCodes = missingCategoryCodes;
            this.state.metrics.totalCPTCodes = totalCPTCodes;

            // Update UI
            this.updateDashboardMetrics();
            this.renderProvidersList();
        } catch (error) {
            console.error('Error loading dashboard metrics:', error);
            this.showAlert('Failed to load rate correction metrics: ' + error.message, 'danger');
        }
    }

    /**
     * Update dashboard metrics in the UI
     */
    updateDashboardMetrics() {
        const metrics = {
            totalProviders: this.state.providers.length,
            missingRateLineItems: 0,
            missingCategoryCodes: 0,
            totalCPTCodes: 0
        };

        // Calculate metrics from current providers
        this.state.providers.forEach(provider => {
            metrics.missingRateLineItems += provider.missing_rate_line_items || 0;
            metrics.missingCategoryCodes += provider.missing_category_line_items || 0;
            metrics.totalCPTCodes += (provider.cpt_codes || []).length;
        });

        // Update state
        this.state.metrics = metrics;

        // Update UI
        document.getElementById('totalProvidersMetric').textContent = 
            metrics.totalProviders.toLocaleString();
        
        document.getElementById('missingRateLineItemsMetric').textContent = 
            metrics.missingRateLineItems.toLocaleString();
        
        document.getElementById('missingCategoryCodesMetric').textContent = 
            metrics.missingCategoryCodes.toLocaleString();
        
        document.getElementById('totalCPTCodesMetric').textContent = 
            metrics.totalCPTCodes.toLocaleString();
    }

    /**
     * Render the list of providers needing corrections
     */
    renderProvidersList() {
        const container = document.getElementById('providersListContainer');
        
        // Clear existing content
        container.innerHTML = '';

        // If no providers left, show empty state
        if (!this.state.providers || this.state.providers.length === 0) {
            container.innerHTML = `
                <div class="alert alert-success">
                    <h4>All Provider Corrections Completed</h4>
                    <p>There are no providers requiring rate corrections at this time.</p>
                </div>
            `;
            return;
        }

        // Render providers
        this.state.providers.forEach(provider => {
            const providerItem = document.createElement('a');
            providerItem.href = '#';
            providerItem.className = 'list-group-item list-group-item-action';
            
            providerItem.innerHTML = `
                <div class="d-flex w-100 justify-content-between">
                    <h5 class="mb-1">${provider.name}</h5>
                    <small>TIN: ${provider.tin}</small>
                </div>
                <p class="mb-1">
                    <span class="badge bg-warning me-2">
                        ${provider.missing_rate_line_items || 0} Missing Rates
                    </span>
                    <span class="badge bg-info">
                        ${provider.cpt_codes ? provider.cpt_codes.length : 0} CPT Codes
                    </span>
                </p>
                <small class="text-muted">${provider.network}</small>
            `;

            providerItem.addEventListener('click', (e) => {
                e.preventDefault();
                this.selectProvider(provider);
            });

            container.appendChild(providerItem);
        });

        // Update metrics
        this.updateDashboardMetrics();
    }

    /**
     * Select a provider and load their details
     * @param {Object} provider - Selected provider details
     */
    // Fix the selectProvider function
    async selectProvider(provider) {
        try {
            // Update UI to reflect loading state
            const detailContent = document.getElementById('providerDetailContent');
            if (detailContent) {
                detailContent.innerHTML = '<div class="d-flex justify-content-center"><div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div></div>';
            }
            
            // Fetch detailed provider information
            const response = await fetch(`/rate_corrections/api/provider/details?tin=${provider.tin}`);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch provider details: ${response.status} ${response.statusText}`);
            }

            const providerDetails = await response.json();
            
            // Update state
            this.state.selectedProvider = {
                ...provider,
                details: providerDetails
            };
            
            // Store in global state for other components
            window.RateCorrections.currentTIN = provider.tin;
            window.RateCorrections.currentProviderName = provider.name;
            window.RateCorrections.currentProviderData = providerDetails;

            // Switch to provider detail view
            this.switchToProviderDetailView();

            // Render provider details
            this.renderProviderDetails(providerDetails);
        } catch (error) {
            console.error('Error selecting provider:', error);
            this.showAlert('Failed to load provider details: ' + error.message, 'danger');
        }
    }

    /**
     * Render provider details in the UI
     * @param {Object} providerDetails - Detailed provider information
     */
    renderProviderDetails(providerDetails) {
        const detailContent = document.getElementById('providerDetailContent');
        
        // Update title
        document.getElementById('providerDetailTitle').textContent = 
            `Provider Details: ${this.state.selectedProvider.name}`;

        // Enable detail and correction buttons
        this.views.providerDetailViewBtn.disabled = false;
        this.views.correctionWorkflowBtn.disabled = false;

        // Generate HTML for provider details
        detailContent.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h4>Provider Information</h4>
                    <p><strong>TIN:</strong> ${this.state.selectedProvider.tin}</p>
                    <p><strong>Network:</strong> ${this.state.selectedProvider.network}</p>
                    <p><strong>Total Line Items Missing Rates:</strong> ${providerDetails.total_line_items}</p>
                </div>
                <div class="col-md-6">
                    <h4>Correction Options</h4>
                    <div class="d-grid gap-2">
                        <button id="lineItemCorrectionBtn" class="btn btn-primary">
                            Line Item Corrections
                        </button>
                        <button id="categoryCorrectionBtn" class="btn btn-secondary">
                            Category-Based Corrections
                        </button>
                    </div>
                </div>
            </div>

            <div class="mt-4">
                <h4>Missing Rate Items</h4>
                <table class="table table-sm">
                    <thead>
                        <tr>
                            <th>CPT Code</th>
                            <th>Description</th>
                            <th>Current Category</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${providerDetails.missing_rate_items.map(item => `
                            <tr>
                                <td>${item.cpt_code}</td>
                                <td>${item.description}</td>
                                <td>${item.current_category}</td>
                            </tr>
                        `).join('') || '<tr><td colspan="3">No missing rate items</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;

        // Add event listeners for correction buttons
        const lineItemBtn = document.getElementById('lineItemCorrectionBtn');
        const categoryBtn = document.getElementById('categoryCorrectionBtn');

        lineItemBtn.addEventListener('click', () => this.startLineItemCorrection());
        categoryBtn.addEventListener('click', () => this.startCategoryCorrection());
    }

    /**
     * Start line item correction workflow
     */
    startLineItemCorrection() {
        // This will be implemented in the corrections.js file
        console.log('Starting line item correction');
        this.switchToCorrectionWorkflow('line-item');
    }

    /**
     * Start category-based correction workflow
     */
    startCategoryCorrection() {
        // This will be implemented in the corrections.js file
        console.log('Starting category correction');
        this.switchToCorrectionWorkflow('category');
    }

    /**
     * Switch views between dashboard, provider details, and correction workflow
     * @param {string} [view='dashboard'] - View to switch to
     */
    switchToDashboardView() {
        this.views.dashboardViewBtn.classList.add('active');
        this.views.providerDetailViewBtn.classList.remove('active');
        this.views.correctionWorkflowBtn.classList.remove('active');

        this.views.dashboard.style.display = 'block';
        this.views.providerDetails.style.display = 'none';

        // Force re-render of providers list
        this.renderProvidersList();
        this.updateDashboardMetrics();
    }

    /**
     * Switch to provider details view
     */
    switchToProviderDetailView() {
        this.views.dashboardViewBtn.classList.remove('active');
        this.views.providerDetailViewBtn.classList.add('active');
        this.views.correctionWorkflowBtn.classList.remove('active');

        this.views.dashboard.style.display = 'none';
        this.views.providerDetails.style.display = 'block';
    }

    /**
     * Switch to correction workflow
     * @param {string} [type=''] - Type of correction (line-item or category)
     */
    switchToCorrectionWorkflow(type = '') {
        this.views.dashboardViewBtn.classList.remove('active');
        this.views.providerDetailViewBtn.classList.remove('active');
        this.views.correctionWorkflowBtn.classList.add('active');

        this.views.dashboard.style.display = 'none';
        this.views.providerDetails.style.display = 'block';

        // Trigger correction workflow in corrections.js
        window.triggerCorrectionWorkflow(this.state.selectedProvider, type);
    }

    /**
     * Show an alert message
     * @param {string} message - Alert message
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

    /**
     * Initialize the application
     */
    init() {
        // Load initial dashboard metrics
        this.loadDashboardMetrics();
    }
}

// Create and initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new RateCorrectionsApp();
    app.init();

    // Expose app instance globally for debugging and potential external access
    window.rateCorrectionsApp = app;
});
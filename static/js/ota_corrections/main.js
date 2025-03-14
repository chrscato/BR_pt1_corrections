/**
 * Main application logic for Out-of-Network (OTA) rate corrections
 */
class OTACorrections {
    constructor() {
        this.state = {
            selectedProvider: null,
            providers: [],
            correctionWorkflow: null
        };
        
        // Initialize components
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        // Load providers
        await this.loadProviders();
        
        // Set up event listeners
        this.setupEventListeners();
    }

    /**
     * Load providers with missing rates
     */
    async loadProviders() {
        try {
            const response = await fetch('/ota_corrections/api/providers/missing-rates');
            if (!response.ok) {
                throw new Error('Failed to load providers');
            }

            const data = await response.json();
            this.state.providers = data.providers;
            
            // Update provider count
            const providerCount = document.getElementById('providerCount');
            if (providerCount) {
                providerCount.textContent = data.total;
                providerCount.className = 'badge rounded-pill ' + 
                    (data.total > 5 ? 'bg-danger' : 
                     data.total > 0 ? 'bg-warning' : 
                     'bg-success');
            }

            // Render providers
            this.renderProviders();
        } catch (error) {
            console.error('Error loading providers:', error);
            this.showAlert('Error loading providers', 'danger');
        }
    }

    /**
     * Render the provider list
     */
    renderProviders() {
        const providerList = document.getElementById('providerList');
        if (!providerList) return;

        providerList.innerHTML = '';

        if (this.state.providers.length === 0) {
            providerList.innerHTML = `
                <div class="alert alert-success mb-0">
                    <h5 class="alert-heading">All OTA Rate Corrections Completed! 🎉</h5>
                    <p class="mb-0">There are no out-of-network providers requiring rate corrections at this time.</p>
                </div>
            `;
            return;
        }

        this.state.providers.forEach(provider => {
            const listItem = document.createElement('div');
            listItem.className = 'list-group-item provider-item';
            listItem.setAttribute('data-tin', provider.tin);

            listItem.innerHTML = `
                <div class="d-flex w-100 justify-content-between">
                    <h6 class="mb-1">${provider.name}</h6>
                    <small class="text-muted">${provider.missing_rate_line_items} missing</small>
                </div>
                <p class="mb-1 small">TIN: ${provider.tin}</p>
                <div class="cpt-codes">
                    <small class="text-muted d-block mb-1">CPT Codes:</small>
                    ${provider.cpt_codes.map(cpt => 
                        `<span class="badge bg-secondary me-1">${cpt}</span>`
                    ).join('')}
                </div>
            `;

            providerList.appendChild(listItem);
        });

        // Set up event listeners for provider selection
        this.setupProviderSelectionListeners();
    }

    /**
     * Set up event listeners for provider selection
     */
    setupProviderSelectionListeners() {
        const providerItems = document.querySelectorAll('.provider-item');
        providerItems.forEach(item => {
            item.addEventListener('click', () => {
                const tin = item.getAttribute('data-tin');
                const provider = this.state.providers.find(p => p.tin === tin);
                if (provider) {
                    this.selectProvider(provider);
                }
            });
        });
    }

    /**
     * Select a provider for rate corrections
     * @param {Object} provider - Provider to select
     */
    async selectProvider(provider) {
        // Update UI state
        document.querySelectorAll('.provider-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-tin') === provider.tin) {
                item.classList.add('active');
            }
        });

        // Update application state
        this.state.selectedProvider = provider;

        // Initialize correction workflow
        if (window.OTACorrectionWorkflow) {
            // Create new workflow instance if needed
            if (!this.state.correctionWorkflow) {
                this.state.correctionWorkflow = new window.OTACorrectionWorkflow();
            }
            
            // Initialize the workflow with the selected provider
            this.state.correctionWorkflow.initWorkflow(provider);
        } else {
            console.error('OTACorrectionWorkflow not found');
            this.showAlert('Error: Correction workflow not available', 'danger');
        }
    }

    /**
     * Set up application event listeners
     */
    setupEventListeners() {
        // Add refresh button if it exists
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadProviders());
        }
    }

    /**
     * Show an alert message
     * @param {string} message - Alert message
     * @param {string} type - Alert type (success, danger, warning, info)
     */
    showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;

        const container = document.getElementById('correctionWorkflowContent');
        container.insertBefore(alertDiv, container.firstChild);

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.OTACorrections = new OTACorrections();
}); 
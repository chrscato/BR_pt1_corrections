/**
 * Manages the rate correction workflow for out-of-network providers
 */
class OTACorrectionWorkflow {
    constructor() {
        this.state = {
            provider: null,
            lineItems: [],
            currentIndex: 0,
            isSaving: false
        };
    }

    /**
     * Initialize the correction workflow for a selected provider
     * @param {Object} provider - Provider to correct rates for
     */
    async initWorkflow(provider) {
        console.log('Initializing workflow with provider:', provider);
        this.state.provider = provider;
        this.state.currentIndex = 0;
        this.state.lineItems = [];
        
        // Render the initial container
        const container = document.getElementById('correctionWorkflowContent');
        if (!container) return;

        // Format network status
        const networkStatus = this.state.provider.network_status || 
                            this.state.provider.network || 
                            this.state.provider.Provider_Network || 
                            'Out of Network';

        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h5 class="mb-0">Rate Corrections for ${this.state.provider.name || this.state.provider.Billing_Name}</h5>
                </div>
                <div class="card-body">
                    <div class="provider-info mb-4">
                        <p class="mb-1"><strong>TIN:</strong> ${this.state.provider.tin || this.state.provider.TIN}</p>
                        <p class="mb-1"><strong>Network Status:</strong> ${networkStatus}</p>
                    </div>
                    <div id="lineItemsContainer"></div>
                </div>
            </div>
        `;
        
        // Load line items for correction
        await this.loadLineItems();
    }

    /**
     * Load line items for correction
     */
    async loadLineItems() {
        try {
            console.log('Loading line items for provider:', this.state.provider);
            const response = await fetch(`/ota_corrections/api/provider/details?tin=${this.state.provider.tin}`);
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Received provider details:', data);
            
            // Update state with new data
            this.state.cpt_summaries = data.cpt_summaries || {};
            this.state.current_rates = data.current_rates || [];
            
            // Convert CPT summaries to line items, including current rates if they exist
            this.state.lineItems = Object.entries(this.state.cpt_summaries).map(([cpt_code, summary]) => {
                // Find current rate for this CPT code if it exists
                const currentRate = this.state.current_rates.find(rate => rate.CPT === cpt_code);
                
                return {
                    cpt_code,
                    order_id: summary.order_id,
                    patient_name: summary.patient_name,
                    date_of_service: summary.date_of_service,
                    charge: summary.charge,
                    validated_rate: summary.validated_rate,
                    status: summary.status,
                    current_rate: currentRate ? currentRate.rate : null,
                    current_modifier: currentRate ? currentRate.modifier : null
                };
            });

            // Reset current index if it's out of bounds
            if (this.state.currentIndex >= this.state.lineItems.length) {
                this.state.currentIndex = 0;
            }

            // Re-render the line items
            this.renderLineItems();
            
        } catch (error) {
            console.error('Error loading line items:', error);
            this.showAlert(`Error loading line items: ${error.message}`, 'error');
        }
    }

    /**
     * Render the line items
     */
    renderLineItems() {
        const container = document.getElementById('lineItemsContainer');
        if (!container) return;

        if (this.state.lineItems.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    No line items found for this provider.
                </div>
            `;
            return;
        }

        const currentItem = this.state.lineItems[this.state.currentIndex];
        if (!currentItem) return;

        container.innerHTML = `
            <div class="line-item-form">
                <div class="mb-3">
                    <label class="form-label">Patient Name</label>
                    <input type="text" class="form-control" id="patientName" value="${currentItem.patient_name}" readonly>
                </div>
                <div class="mb-3">
                    <label class="form-label">Date of Service</label>
                    <input type="text" class="form-control" id="dateOfService" value="${currentItem.date_of_service}" readonly>
                </div>
                <div class="mb-3">
                    <label class="form-label">Current Rate</label>
                    <input type="number" class="form-control" id="currentRate" value="${currentItem.current_rate || ''}" required>
                </div>
                <div class="mb-3">
                    <label class="form-label">CPT Code</label>
                    <input type="text" class="form-control" id="cptCode" value="${currentItem.cpt_code}" readonly>
                </div>
                <div class="mb-3">
                    <label class="form-label">Modifier</label>
                    <input type="text" class="form-control" id="modifier" value="${currentItem.current_modifier || ''}" required>
                </div>
                <div class="d-flex justify-content-between">
                    <button class="btn btn-secondary" onclick="window.OTACorrections.state.correctionWorkflow.previousItem()" 
                            ${this.state.currentIndex === 0 ? 'disabled' : ''}>
                        Previous
                    </button>
                    <button class="btn btn-primary" onclick="window.OTACorrections.state.correctionWorkflow.saveLineItem()">
                        Save & Continue
                    </button>
                    <button class="btn btn-secondary" onclick="window.OTACorrections.state.correctionWorkflow.nextItem()"
                            ${this.state.currentIndex === this.state.lineItems.length - 1 ? 'disabled' : ''}>
                        Next
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Save the current line item
     */
    async saveLineItem() {
        const currentItem = this.state.lineItems[this.state.currentIndex];
        if (!currentItem) return;

        const rate = document.getElementById('currentRate').value;
        const modifier = document.getElementById('modifier').value;

        // Validate rate
        if (!rate) {
            this.showAlert('Please enter a rate', 'error');
            return;
        }

        try {
            const response = await fetch('/ota_corrections/api/line-item/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    cpt_code: currentItem.cpt_code,
                    current_rate: parseFloat(rate),
                    current_modifier: modifier || null,
                    order_id: currentItem.order_id
                })
            });

            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Failed to save line item');
            }

            // Show success message
            this.showAlert('Line item saved successfully!', 'success');

            // Remove the saved CPT code from our state
            this.state.lineItems = this.state.lineItems.filter(item => item.cpt_code !== currentItem.cpt_code);
            delete this.state.cpt_summaries[currentItem.cpt_code];

            // Reset current index if needed
            if (this.state.currentIndex >= this.state.lineItems.length) {
                this.state.currentIndex = Math.max(0, this.state.lineItems.length - 1);
            }

            // Re-render the line items
            this.renderLineItems();

            // Show completion message if no more items
            if (this.state.lineItems.length === 0) {
                this.showCompletionMessage();
            }

        } catch (error) {
            console.error('Error saving line item:', error);
            this.showAlert(`Error saving line item: ${error.message}`, 'error');
        }
    }

    /**
     * Move to the next line item
     */
    nextItem() {
        if (this.state.currentIndex < this.state.lineItems.length - 1) {
            this.state.currentIndex++;
            this.renderLineItems();
        } else {
            this.showCompletionMessage();
        }
    }

    /**
     * Move to the previous line item
     */
    previousItem() {
        if (this.state.currentIndex > 0) {
            this.state.currentIndex--;
            this.renderLineItems();
        }
    }

    /**
     * Show completion message
     */
    showCompletionMessage() {
        const container = document.getElementById('lineItemsContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="alert alert-success">
                <h5 class="alert-heading">All Rate Corrections Completed! 🎉</h5>
                <p class="mb-0">You have successfully corrected all rates for this provider.</p>
            </div>
        `;
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

    renderLineItemCorrection(lineItem) {
        const summary = this.state.cpt_summaries[lineItem.cpt_code];
        if (!summary) return null;

        return `
            <div class="line-item-correction">
                <div class="line-item-header">
                    <h5>CPT Code: ${lineItem.cpt_code}</h5>
                    <div class="line-item-meta">
                        <span class="patient-name">Patient: ${summary.patient_name}</span>
                        <span class="date-of-service">DOS: ${summary.date_of_service}</span>
                    </div>
                </div>
                <div class="line-item-details">
                    <div class="form-group">
                        <label for="rate_${lineItem.cpt_code}">Rate</label>
                        <input type="number" 
                               class="form-control" 
                               id="rate_${lineItem.cpt_code}"
                               value="${lineItem.rate || ''}"
                               step="0.01"
                               min="0"
                               required>
                    </div>
                    <div class="form-group">
                        <label for="modifier_${lineItem.cpt_code}">Modifier</label>
                        <input type="text" 
                               class="form-control" 
                               id="modifier_${lineItem.cpt_code}"
                               value="${lineItem.modifier || ''}"
                               maxlength="2">
                    </div>
                </div>
            </div>
        `;
    }
}

// Make the class globally available
window.OTACorrectionWorkflow = OTACorrectionWorkflow; 
/**
 * Provider-specific logic for Out-of-Network Rate Corrections
 */
class OTAProviderManager {
    /**
     * Fetch detailed provider rate information
     * @param {string} tin - Tax Identification Number
     * @returns {Promise} Detailed provider rate information
     */
    static async fetchProviderRateDetails(tin) {
        try {
            const response = await fetch(`/ota_corrections/api/provider/details?tin=${tin}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch provider details');
            }

            return await response.json();
        } catch (error) {
            console.error('Provider rate details error:', error);
            throw error;
        }
    }

    /**
     * Analyze provider's rate correction needs
     * @param {Object} providerDetails - Detailed provider information
     * @returns {Object} Analysis of correction needs
     */
    static analyzeRateCorrectionsNeeds(providerDetails) {
        const analysis = {
            totalLineItems: providerDetails.total_line_items || 0,
            missingRateItems: providerDetails.missing_rate_items || [],
            currentRates: providerDetails.current_rates || [],
            possibleCategories: providerDetails.possible_categories || {},
            recommendedApproach: null
        };

        // Determine recommended correction approach
        if (analysis.missingRateItems.length > 10) {
            analysis.recommendedApproach = 'category';
        } else {
            analysis.recommendedApproach = 'line-item';
        }

        return analysis;
    }

    /**
     * Prepare line items for correction
     * @param {Array} missingRateItems - Items missing rates
     * @returns {Array} Prepared line items
     */
    static prepareLineItemsForCorrection(missingRateItems) {
        return missingRateItems.map(item => ({
            ...item,
            suggestedRate: null,
            suggestedCategory: item.current_category
        }));
    }

    /**
     * Validate line item correction
     * @param {Object} lineItem - Line item to validate
     * @returns {Object} Validation result
     */
    static validateLineItemCorrection(lineItem) {
        const errors = [];

        if (!lineItem.suggestedRate || lineItem.suggestedRate <= 0) {
            errors.push('Invalid rate');
        }

        if (!lineItem.suggestedCategory) {
            errors.push('Category is required');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Generate category rate suggestions
     * @param {Object} providerDetails - Provider rate details
     * @returns {Object} Suggested category rates
     */
    static generateCategoryRateSuggestions(providerDetails) {
        const suggestions = {};
        const possibleCategories = providerDetails.possible_categories || {};

        // If current rates exist, use them as a baseline
        const currentRates = providerDetails.current_rates || [];

        Object.keys(possibleCategories).forEach(category => {
            // Try to find an existing rate for this category
            const categoryRates = currentRates.filter(
                rate => rate.proc_category === category
            );

            if (categoryRates.length > 0) {
                // Use the most common rate for this category
                const rateFrequency = {};
                categoryRates.forEach(rate => {
                    rateFrequency[rate.rate] = (rateFrequency[rate.rate] || 0) + 1;
                });

                const mostCommonRate = Object.entries(rateFrequency).reduce(
                    (a, b) => b[1] > a[1] ? b : a
                )[0];

                suggestions[category] = parseFloat(mostCommonRate);
            } else {
                // No existing rate, use a default
                suggestions[category] = 500.00;
            }
        });

        return suggestions;
    }

    /**
     * Format a network status for display
     * @param {string} status - The network status
     * @returns {string} - Formatted network status badge
     */
    static formatNetworkStatus(status) {
        if (!status) return '<span class="badge bg-secondary">Unknown</span>';
        
        if (status.toLowerCase().includes('out')) {
            return '<span class="badge bg-danger">Out of Network</span>';
        } else if (status.toLowerCase().includes('in')) {
            return '<span class="badge bg-success">In Network</span>';
        } else if (status.toLowerCase().includes('pending')) {
            return '<span class="badge bg-warning">Pending</span>';
        }
        
        return `<span class="badge bg-secondary">${status}</span>`;
    }

    /**
     * Format a TIN for display
     * @param {string} tin - The TIN to format
     * @returns {string} - Formatted TIN
     */
    static formatTIN(tin) {
        if (!tin) return 'N/A';
        const cleanTIN = tin.replace(/\D/g, '');
        if (cleanTIN.length !== 9) return tin;
        return `${cleanTIN.slice(0, 2)}-${cleanTIN.slice(2)}`;
    }

    /**
     * Format an NPI for display
     * @param {string} npi - The NPI to format
     * @returns {string} - Formatted NPI
     */
    static formatNPI(npi) {
        if (!npi) return 'N/A';
        const cleanNPI = npi.replace(/\D/g, '');
        if (cleanNPI.length !== 10) return npi;
        return cleanNPI;
    }
} 
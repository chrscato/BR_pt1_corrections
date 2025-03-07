/**
 * Category pricing functionality for the Rate Corrections tool
 * Handles category selection, pricing, and updates
 */

/**
 * Set up event listeners specifically for category pricing
 */
function setupCategoryPricingEventListeners() {
    // Category select
    const categorySelect = document.getElementById('categorySelect');
    if (categorySelect) {
        categorySelect.addEventListener('change', function() {
            const selectedCategory = this.value;
            if (selectedCategory) {
                showCategoryDetails(selectedCategory);
            }
        });
    }

    // Add category button
    const addCategoryButton = document.getElementById('addCategoryButton');
    if (addCategoryButton) {
        addCategoryButton.addEventListener('click', function() {
            addCategoryToSelection();
        });
    }
    
    // Update rates button
    const updateRatesButton = document.getElementById('updateRatesButton');
    if (updateRatesButton) {
        updateRatesButton.addEventListener('click', function() {
            showUpdateConfirmation();
        });
    }
    
    // Confirm update button in modal
    const confirmActionButton = document.getElementById('confirmActionButton');
    if (confirmActionButton) {
        confirmActionButton.addEventListener('click', function() {
            updateCategoryRates();
        });
    }
}

/**
 * Load all available procedure categories
 */
async function loadCategories() {
    try {
        console.log('Loading categories...');
        const response = await fetch('/rate_corrections/api/categories');
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Check for error message from server
        if (data.error) {
            console.error('Server reported error:', data.error);
            return;
        }
        
        // Store categories globally
        window.RateCorrections.allCategories = data.categories || {};
        
        // Populate the category select dropdown
        const categorySelect = document.getElementById('categorySelect');
        if (categorySelect) {
            // Clear any existing options except the first one
            while (categorySelect.options.length > 1) {
                categorySelect.remove(1);
            }
            
            // Add categories
            Object.keys(window.RateCorrections.allCategories).sort().forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = `${category} (${window.RateCorrections.allCategories[category].count} CPT codes)`;
                categorySelect.appendChild(option);
            });
        }
        
        console.log(`Loaded ${Object.keys(window.RateCorrections.allCategories).length} categories`);
    } catch (error) {
        console.error('Error loading categories:', error);
        showAlert(`Error loading categories: ${error.message}`, 'error');
    }
}

/**
 * Show details for a selected category
 * @param {string} category - The category name
 */
function showCategoryDetails(category) {
    console.log(`Showing details for category: ${category}`);
    
    const allCategories = window.RateCorrections.allCategories;
    
    if (!allCategories[category]) {
        console.error(`Category not found: ${category}`);
        return;
    }
    
    const categoryDetails = document.getElementById('categoryDetails');
    categoryDetails.classList.remove('d-none');
    
    // Update category title and description
    document.getElementById('categoryTitle').textContent = category;
    document.getElementById('categoryDescription').textContent = 
        `This category includes ${allCategories[category].count} CPT codes commonly used for ${category.toLowerCase()} procedures.`;
    
    // Display CPT codes
    const cptList = document.getElementById('categoryCPTList');
    cptList.innerHTML = '';
    
    allCategories[category].proc_codes.forEach(cpt => {
        const badge = document.createElement('span');
        badge.className = 'cpt-badge';
        badge.textContent = cpt;
        cptList.appendChild(badge);
    });
}

/**
 * Add the selected category to the selection
 */
function addCategoryToSelection() {
    // Get selected category and rate
    const categorySelect = document.getElementById('categorySelect');
    const categoryRate = document.getElementById('categoryRate');
    
    const category = categorySelect.value;
    const rate = parseFloat(categoryRate.value);
    
    if (!category) {
        showAlert('Please select a category', 'warning');
        return;
    }
    
    if (isNaN(rate) || rate <= 0) {
        showAlert('Please enter a valid rate greater than zero', 'warning');
        return;
    }
    
    // Add to selected categories
    window.RateCorrections.selectedCategories[category] = rate;
    
    // Update display
    updateSelectedCategoriesTable();
    
    // Enable update button
    document.getElementById('updateRatesButton').disabled = false;
    
    // Show selected categories table
    document.getElementById('selectedCategories').style.display = 'block';
    
    // Reset category select and rate
    categorySelect.selectedIndex = 0;
    categoryRate.value = '';
    
    // Hide category details
    document.getElementById('categoryDetails').classList.add('d-none');
}

/**
 * Update the selected categories table
 */
function updateSelectedCategoriesTable() {
    const table = document.getElementById('selectedCategoriesTable');
    const allCategories = window.RateCorrections.allCategories;
    const selectedCategories = window.RateCorrections.selectedCategories;
    
    // Clear table
    table.innerHTML = '';
    
    if (Object.keys(selectedCategories).length === 0) {
        document.getElementById('selectedCategories').style.display = 'none';
        return;
    }
    
    // Display selected categories
    Object.keys(selectedCategories).forEach(category => {
        const row = document.createElement('tr');
        const cptCount = allCategories[category] ? allCategories[category].count : 0;
        
        row.innerHTML = `
            <td>${category}</td>
            <td>${cptCount}</td>
            <td>$${selectedCategories[category].toFixed(2)}</td>
            <td>
                <button class="btn btn-sm btn-outline-danger" onclick="removeCategory('${category}')">
                    Remove
                </button>
            </td>
        `;
        
        table.appendChild(row);
    });
}

/**
 * Remove a category from the selection
 * @param {string} category - The category to remove
 */
function removeCategory(category) {
    // Remove from selected categories
    delete window.RateCorrections.selectedCategories[category];
    
    // Update display
    updateSelectedCategoriesTable();
    
    // Disable update button if no categories selected
    if (Object.keys(window.RateCorrections.selectedCategories).length === 0) {
        document.getElementById('updateRatesButton').disabled = true;
    }
}

/**
 * Show confirmation modal for updating rates
 */
function showUpdateConfirmation() {
    const selectedCategories = window.RateCorrections.selectedCategories;
    const allCategories = window.RateCorrections.allCategories;
    
    if (Object.keys(selectedCategories).length === 0) {
        showAlert('Please select at least one category', 'warning');
        return;
    }
    
    if (!window.RateCorrections.currentTIN) {
        showAlert('No provider selected', 'warning');
        return;
    }
    
    // Update confirmation details
    const totalCPTs = Object.keys(selectedCategories).reduce((sum, category) => {
        return sum + (allCategories[category] ? allCategories[category].count : 0);
    }, 0);
    
    const confirmationDetails = document.getElementById('confirmationDetails');
    confirmationDetails.innerHTML = `
        <div class="alert alert-info mb-0">
            <p><strong>Provider:</strong> ${window.RateCorrections.currentProviderName}</p>
            <p><strong>TIN:</strong> ${formatTIN(window.RateCorrections.currentTIN)}</p>
            <p><strong>Categories:</strong> ${Object.keys(selectedCategories).length}</p>
            <p><strong>Total CPT codes affected:</strong> ${totalCPTs}</p>
            <div class="mt-2">
                <strong>Category Rates:</strong>
                <ul class="mb-0">
                    ${Object.entries(selectedCategories).map(([category, rate]) => 
                        `<li>${category}: $${rate.toFixed(2)}</li>`
                    ).join('')}
                </ul>
            </div>
        </div>
    `;
    
    // Show the modal
    const confirmationModal = new bootstrap.Modal(document.getElementById('confirmationModal'));
    confirmationModal.show();
}

/**
 * Update rates for the selected categories
 */
async function updateCategoryRates() {
    const selectedCategories = window.RateCorrections.selectedCategories;
    const allCategories = window.RateCorrections.allCategories;
    
    if (Object.keys(selectedCategories).length === 0) {
        showAlert('Please select at least one category', 'warning');
        return;
    }
    
    if (!window.RateCorrections.currentTIN) {
        showAlert('No provider selected', 'warning');
        return;
    }
    
    try {
        // Disable the confirm button
        const confirmButton = document.getElementById('confirmActionButton');
        confirmButton.disabled = true;
        confirmButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Updating...';
        
        // Send request to update rates
        const response = await fetch('/rate_corrections/api/update_category_rates', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                tin: window.RateCorrections.currentTIN,
                provider_name: window.RateCorrections.currentProviderName,
                state: 'XX', // Default state if not available
                category_rates: selectedCategories
            }),
        });
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // Hide the modal
        const confirmationModal = bootstrap.Modal.getInstance(document.getElementById('confirmationModal'));
        if (confirmationModal) {
            confirmationModal.hide();
        }
        
        // Show success message
        showAlert('Rates updated successfully!', 'success');
        
        // Get all updated CPT codes
        const updatedCPTs = [];
        Object.keys(selectedCategories).forEach(category => {
            if (allCategories[category] && allCategories[category].proc_codes) {
                updatedCPTs.push(...allCategories[category].proc_codes);
            }
        });
        
        // Reload TIN details to refresh rates
        loadTINDetails(window.RateCorrections.currentTIN, window.RateCorrections.currentProviderName);
        
        // Wait for data to load then highlight updated rates
        setTimeout(() => {
            highlightUpdatedRates(updatedCPTs);
        }, 1000);
        
        // Reset selected categories
        window.RateCorrections.selectedCategories = {};
        updateSelectedCategoriesTable();
        
    } catch (error) {
        console.error('Error updating rates:', error);
        showAlert(`Error updating rates: ${error.message}`, 'error');
        
        // Reset button
        const confirmButton = document.getElementById('confirmActionButton');
        confirmButton.disabled = false;
        confirmButton.textContent = 'Update Rates';
    }
}
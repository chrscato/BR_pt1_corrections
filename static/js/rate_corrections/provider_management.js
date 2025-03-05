/**
 * Provider management functionality for the Rate Corrections tool
 * Handles loading providers/TINs, displaying details, and file management
 */

/**
 * Set up event listeners specifically for provider management
 */
function setupProviderEventListeners() {
    // No specific event listeners needed here
    // Provider selection is handled via click handlers attached when loading the TIN list
}

/**
 * Load the list of TINs with rate failures
 */
async function loadTINs() {
    try {
        console.log('Loading TINs with rate failures...');
        const response = await fetch('/rate_corrections/api/tins');
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Check for error message from server
        if (data.error) {
            console.error('Server reported error:', data.error);
            showAlert(data.error, 'error');
        }
        
        const tinList = document.getElementById('tinList');
        tinList.innerHTML = '';
        
        // Update TIN count badge
        const tinCount = document.getElementById('tinCount');
        if (tinCount) {
            tinCount.textContent = data.tins ? data.tins.length : '0';
        }

        if (data.tins && data.tins.length > 0) {
            console.log(`Found ${data.tins.length} TINs with rate failures`);
            data.tins.forEach(tin => {
                const listItem = document.createElement('a');
                listItem.className = 'list-group-item list-group-item-action list-group-item-tin';
                listItem.href = '#';
                
                // Format the TIN with dashes for display
                const formattedTIN = formatTIN(tin.tin);
                
                // Safely handle network status - check if it exists and is a string before using includes()
                const networkStatus = tin.provider_network || '';
                const isOutOfNetwork = typeof networkStatus === 'string' && networkStatus.includes('Out');
                
                // Format network status
                const networkDisplay = isOutOfNetwork ? 
                    '<span class="badge bg-danger">Out of Network</span>' : 
                    '<span class="badge bg-success">In Network</span>';
                
                listItem.innerHTML = `
                    <div class="d-flex w-100 justify-content-between">
                        <h6 class="mb-1">${tin.provider_name || 'Unknown Provider'}</h6>
                        <small>${networkDisplay}</small>
                    </div>
                    <p class="mb-1 small">TIN: ${formattedTIN}</p>
                    <div class="d-flex w-100 justify-content-between">
                        <small>${tin.cpt_codes ? tin.cpt_codes.length : 0} CPT codes</small>
                        <small class="text-danger">${tin.failures_count || 0} failures</small>
                    </div>
                `;
                
                listItem.onclick = (e) => {
                    e.preventDefault();
                    // Remove active class from all TINs
                    document.querySelectorAll('#tinList a').forEach(a => a.classList.remove('active'));
                    // Add active class to clicked TIN
                    listItem.classList.add('active');
                    loadTINDetails(tin.tin, tin.provider_name || 'Unknown Provider');
                };
                
                tinList.appendChild(listItem);
            });
        } else {
            console.log("No TINs with rate failures found");
            tinList.innerHTML = '<div class="list-group-item">No TINs with rate failures found</div>';
        }
    } catch (error) {
        console.error('Error loading TINs:', error);
        showAlert(`Error loading TINs: ${error.message}`, 'error');
        
        const tinList = document.getElementById('tinList');
        tinList.innerHTML = `<div class="list-group-item text-danger">Error: ${error.message}</div>`;
    }
}

/**
 * Load detailed information about a TIN
 * @param {string} tin - The TIN to load details for
 * @param {string} providerName - The provider name
 */
async function loadTINDetails(tin, providerName) {
    try {
        console.log(`Loading details for TIN: ${tin}`);
        currentTIN = tin;
        currentProviderName = providerName;
        
        // Show loading indicator
        document.getElementById('providerInfo').innerHTML = `
            <div class="alert alert-info">
                Loading provider details for TIN: ${formatTIN(tin)}...
            </div>
        `;
        
        // Reset selected categories
        selectedCategories = {};
        updateSelectedCategoriesTable();
        
        // Fetch the TIN details
        const response = await fetch(`/rate_corrections/api/tin/${tin}/details`);
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        currentProviderData = data;
        
        // Check for error message from server
        if (data.error) {
            console.error('Server reported error:', data.error);
            showAlert(data.error, 'error');
            return;
        }
        
        console.log('Received TIN details:', data);
        
        // Display provider details
        displayProviderDetails(data);
        
        // Display current rates
        displayCurrentRates(data.current_rates);
        
        // Display failed files
        displayFailedFiles(data.failures);
        
        // Reset update button state
        const updateRatesButton = document.getElementById('updateRatesButton');
        if (updateRatesButton) {
            updateRatesButton.disabled = true;
        }
    } catch (error) {
        console.error('Error loading TIN details:', error);
        showAlert(`Error loading TIN details: ${error.message}`, 'error');
        
        document.getElementById('providerInfo').innerHTML = `
            <div class="alert alert-danger">
                Error loading provider details: ${error.message}
            </div>
        `;
    }
}

/**
 * Display provider details in the UI
 * @param {Object} data - Provider data from the server
 */
function displayProviderDetails(data) {
    if (!data.failures || data.failures.length === 0) {
        document.getElementById('providerInfo').innerHTML = `
            <div class="alert alert-warning">
                No rate failures found for TIN: ${formatTIN(data.tin)}
            </div>
        `;
        
        // Hide provider details
        document.getElementById('providerDetails').classList.add('d-none');
        return;
    }
    
    // Show provider details section
    document.getElementById('providerDetails').classList.remove('d-none');
    
    // Get provider info from the first failure record
    const providerInfo = data.failures[0].provider_info || {};
    
    // Provider name and TIN
    document.getElementById('providerName').textContent = currentProviderName || 'Unknown Provider';
    document.getElementById('providerTIN').textContent = formatTIN(data.tin);
    
    // Other provider details
    document.getElementById('providerNPI').textContent = providerInfo.NPI || 'N/A';
    document.getElementById('providerNetwork').textContent = providerInfo['Provider Network'] || 'Unknown';
    document.getElementById('providerLocation').textContent = providerInfo['Location'] || 'Unknown';
    document.getElementById('providerStatus').textContent = providerInfo['Provider Status'] || 'Unknown';
    
    // Update provider info area
    const networkStatus = providerInfo['Provider Network'] || '';
    const isOutOfNetwork = typeof networkStatus === 'string' && networkStatus.includes('Out');
    const networkClass = isOutOfNetwork ? 'danger' : 'success';
    const networkBadge = `<span class="badge bg-${networkClass}">${networkStatus}</span>`;
    
    document.getElementById('providerInfo').innerHTML = `
        <div class="provider-header">
            <h5>${currentProviderName || 'Unknown Provider'}</h5>
            ${networkBadge}
        </div>
        <p class="mb-2">TIN: ${formatTIN(data.tin)}</p>
        <p class="mb-0"><small>${data.failures.length} rate failures found</small></p>
    `;
}

/**
 * Display current rates in the table
 * @param {Array} rates - Array of current rates for the provider
 */
function displayCurrentRates(rates) {
    const table = document.getElementById('currentRatesTable');
    const ratesCount = document.getElementById('ratesCount');
    
    // Store rates globally
    currentRates = rates || [];
    
    // Update rates count
    if (ratesCount) {
        ratesCount.textContent = currentRates.length;
    }
    
    // Clear table
    table.innerHTML = '';
    
    if (!currentRates.length) {
        table.innerHTML = `<tr><td colspan="3" class="text-center">No rates found for this provider</td></tr>`;
        return;
    }
    
    // Sort rates by category and then by CPT code
    currentRates.sort((a, b) => {
        if (a.category !== b.category) {
            return a.category.localeCompare(b.category);
        }
        return a.proc_cd.localeCompare(b.proc_cd);
    });
    
    // Display rates
    currentRates.forEach(rate => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${rate.proc_cd}</td>
            <td>${rate.category}</td>
            <td>$${parseFloat(rate.rate).toFixed(2)}</td>
        `;
        
        // Add ID for later reference
        row.id = `rate-${rate.proc_cd}`;
        
        table.appendChild(row);
    });
}

/**
 * Display failed files in the table
 * @param {Array} failures - Array of failure records
 */
function displayFailedFiles(failures) {
    const table = document.getElementById('failedFilesTable');
    
    // Clear table
    table.innerHTML = '';
    
    if (!failures || !failures.length) {
        table.innerHTML = `<tr><td colspan="4" class="text-center">No failed files found</td></tr>`;
        return;
    }
    
    // Display unique files
    const uniqueFiles = {};
    failures.forEach(failure => {
        const fileName = failure.file_name;
        uniqueFiles[fileName] = {
            file_name: fileName,
            patient_name: failure.patient_name,
            date_of_service: failure.date_of_service,
            order_id: failure.order_id
        };
    });
    
    // Display files
    Object.values(uniqueFiles).forEach(file => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${file.file_name}</td>
            <td>${file.patient_name || 'N/A'}</td>
            <td>${formatDate(file.date_of_service)}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="viewFile('${file.file_name}')">
                    View
                </button>
            </td>
        `;
        
        table.appendChild(row);
    });
}

/**
 * View a specific file's PDF
 * @param {string} fileName - The file name to view
 */
function viewFile(fileName) {
    console.log(`Viewing file: ${fileName}`);
    
    // Update selected file display
    document.getElementById('selectedFileName').textContent = fileName;
    
    // Load PDF into iframe
    const pdfFrame = document.getElementById('pdfFrame');
    pdfFrame.src = `/rate_corrections/api/pdf/${fileName}`;
}

/**
 * Highlight rate rows after update
 * @param {Array} updatedCPTs - Array of CPT codes that were updated
 */
function highlightUpdatedRates(updatedCPTs) {
    // Remove any existing highlights
    document.querySelectorAll('#currentRatesTable tr.row-updated').forEach(row => {
        row.classList.remove('row-updated');
    });
    
    // Add highlight to updated rows
    updatedCPTs.forEach(cpt => {
        const row = document.getElementById(`rate-${cpt}`);
        if (row) {
            row.classList.add('row-updated');
            
            // Scroll to the row
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
}
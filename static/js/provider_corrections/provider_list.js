/**
 * Provider list functionality for the Provider Corrections tool
 * Handles loading and displaying providers with missing data
 */

/**
 * Provider list functionality for the Provider Corrections tool
 * Handles loading and displaying providers with missing data
 */

document.addEventListener("DOMContentLoaded", function () {
    console.log("Initializing Provider List...");
    loadProviders();
});

async function loadProviders() {
    try {
        console.log('Loading providers with missing fields from validation failures...');
        const response = await fetch('/provider_corrections/api/providers/missing_from_failures');

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.error) {
            console.error('Server reported error:', data.error);
            showAlert(data.error, 'error');
            return;
        }

        const providerList = document.getElementById('providerList');
        if (!providerList) {
            console.error("Error: 'providerList' element not found in the DOM.");
            return;
        }

        // Clear existing content
        providerList.innerHTML = '';

        // Update provider count badge
        const providerCount = document.getElementById('providerCount');
        const totalProviders = data.providers ? data.providers.length : 0;
        if (providerCount) {
            providerCount.textContent = totalProviders.toString();
            
            // Update count color based on number of providers
            providerCount.className = 'badge rounded-pill ' + 
                (totalProviders > 5 ? 'bg-danger' : 
                 totalProviders > 0 ? 'bg-warning' : 
                 'bg-success');
        }

        if (data.providers && data.providers.length > 0) {
            console.log(`Found ${data.providers.length} providers with missing fields`);

            data.providers.forEach(provider => {
                const listItem = document.createElement('div');
                listItem.className = 'provider-item';
                listItem.setAttribute('data-provider', JSON.stringify(provider));

                // Add severity class based on missing field count
                const missingFields = provider.missing_fields || [];
                const missingCount = missingFields.length;
                if (missingCount >= 5) {
                    listItem.classList.add('missing-critical');
                } else if (missingCount >= 3) {
                    listItem.classList.add('missing-some');
                } else {
                    listItem.classList.add('missing-few');
                }

                // Get provider name with fallback
                const providerName = provider['DBA Name Billing Name'] || provider['Billing Name'] || 'Unknown Provider';

                // Format TIN and NPI for display
                const tinDisplay = provider.TIN ? provider.TIN : 'Missing';
                const npiDisplay = provider.NPI || 'Missing';

                // Create missing fields badges
                const missingFieldsBadges = missingFields.map(field => 
                    `<span class="badge bg-danger me-1">${field}</span>`
                ).join('');

                listItem.innerHTML = `
                    <div class="d-flex w-100 justify-content-between">
                        <h6 class="mb-1">${providerName}</h6>
                        <small class="text-muted">${missingCount} missing</small>
                    </div>
                    <p class="mb-1 small">TIN: ${tinDisplay} | NPI: ${npiDisplay}</p>
                    <div class="missing-fields-container">
                        <small class="text-muted d-block mb-1">Missing Fields:</small>
                        ${missingFieldsBadges}
                    </div>
                `;

                providerList.appendChild(listItem);
            });

            // Set up event listeners *AFTER* all providers are added
            setupProviderListEventListeners();
            
        } else {
            // Show completion message when no providers need corrections
            providerList.innerHTML = `
                <div class="alert alert-success mb-0">
                    <h5 class="alert-heading">All Provider Corrections Completed! 🎉</h5>
                    <p class="mb-0">There are no providers requiring corrections at this time.</p>
                </div>
            `;
            
            // Clear any active provider details
            const providerInfo = document.getElementById('providerInfo');
            if (providerInfo) {
                providerInfo.innerHTML = `
                    <div class="alert alert-info">
                        All provider corrections are complete. Great job!
                    </div>
                `;
            }
            
            // Hide the editor if it's visible
            const providerEditor = document.getElementById('providerEditor');
            if (providerEditor) {
                providerEditor.classList.add('d-none');
            }
        }
    } catch (error) {
        console.error('Error loading providers:', error);
        showAlert(`Error loading providers: ${error.message}`, 'error');
    }
}

/**
 * Attach event listeners to provider list items after they are added to the DOM.
 */
function setupProviderListEventListeners() {
    console.log("Setting up provider list event listeners...");

    const providerItems = document.querySelectorAll('.provider-item');

    if (providerItems.length === 0) {
        console.warn("No provider items found to attach event listeners.");
        return;
    }

    providerItems.forEach(item => {
        item.addEventListener('click', function () {
            document.querySelectorAll('.provider-item').forEach(el => el.classList.remove('active'));
            this.classList.add('active');

            const providerData = JSON.parse(this.getAttribute('data-provider'));
            loadProviderDetails(providerData);
        });
    });
}

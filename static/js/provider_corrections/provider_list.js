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

        providerList.innerHTML = '';

        // Update provider count badge
        const providerCount = document.getElementById('providerCount');
        if (providerCount) {
            providerCount.textContent = data.providers ? data.providers.length : '0';
        }

        if (data.providers && data.providers.length > 0) {
            console.log(`Found ${data.providers.length} providers with missing fields from failures`);

            data.providers.forEach(provider => {
                const listItem = document.createElement('div');
                listItem.className = 'provider-item';
                listItem.setAttribute('data-provider', JSON.stringify(provider));

                // Add severity class based on missing field count
                const missingCount = provider.missing_count || 0;
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

                listItem.innerHTML = `
                    <div class="d-flex w-100 justify-content-between">
                        <h6 class="mb-1">${providerName}</h6>
                    </div>
                    <p class="mb-1 small">TIN: ${tinDisplay} | NPI: ${npiDisplay}</p>
                `;

                providerList.appendChild(listItem);
            });

            // Set up event listeners *AFTER* all providers are added
            setTimeout(() => {
                setupProviderListEventListeners();
            }, 100);
        } else {
            providerList.innerHTML = '<div class="list-group-item">No providers with missing fields found</div>';
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

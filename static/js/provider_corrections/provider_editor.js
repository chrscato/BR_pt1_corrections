/**
 * Provider editor functionality - Improved UX
 * Handles displaying and updating provider details with better validation
 */


function setupProviderEditorEventListeners() {
    console.log("Setting up provider editor event listeners...");

    document.getElementById('saveProviderButton').addEventListener('click', saveProviderChanges);
}

function loadProviderDetails(provider) {
    console.log(`Loading details for provider: ${provider.PrimaryKey}`);

    document.getElementById('providerInfo').classList.add('d-none');
    document.getElementById('providerEditor').classList.remove('d-none');

    // Populate text fields
    document.getElementById('primaryKey').value = provider.PrimaryKey || '';
    document.getElementById('dbaName').value = provider['DBA Name Billing Name'] || '';
    document.getElementById('billingName').value = provider['Billing Name'] || provider['DBA Name Billing Name'] || '';
    document.getElementById('tin').value = formatTIN(provider.TIN);
    document.getElementById('npi').value = formatNPI(provider.NPI);
    document.getElementById('billingAddress1').value = provider['Billing Address 1'] || provider['Address 1 Full'] || '';
    document.getElementById('billingCity').value = provider['Billing Address City'] || '';
    document.getElementById('billingState').value = provider['Billing Address State'] || '';
    document.getElementById('billingZip').value = provider['Billing Address Postal Code'] || '';

    // Prepopulate dropdowns
    setDropdownValue('providerType', provider['Provider Type']);
    setDropdownValue('providerNetwork', provider['Provider Network']);
    setDropdownValue('providerStatus', provider['Provider Status']);

    // Load PDF preview
    loadPDFFooter(provider.file_name);
}


/**
 * Utility function to set dropdown values safely
 */
function setDropdownValue(dropdownId, value) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    
    const optionExists = [...dropdown.options].some(option => option.value === value);
    
    if (optionExists) {
        dropdown.value = value;
    } else {
        dropdown.value = "";  // Reset if value is invalid
    }
}




async function loadPDFFooter(filePath) {
    if (!filePath) {
        console.warn("No associated PDF file found.");
        return;
    }

    // Extract the filename, remove the full path
    const fileName = filePath.split('\\').pop().split('/').pop().replace('.json', '.pdf');

    console.log(`Fetching PDF: /provider_corrections/api/pdf/${fileName}`);

    try {
        const response = await fetch(`/provider_corrections/api/pdf/${fileName}`);

        if (!response.ok) {
            throw new Error(`Failed to load PDF: ${response.status}`);
        }

        const pdfFrame = document.getElementById('pdfFrame');
        if (pdfFrame) {
            pdfFrame.src = URL.createObjectURL(await response.blob());
        }
    } catch (error) {
        console.error(`Error loading PDF: ${error}`);
    }
}



// Utility: Auto-format TIN (Tax ID) input
function formatTIN(value) {
    if (!value) return "";
    return value.replace(/\D/g, "").slice(0, 9);  // Keep only numbers (max 9 digits)
}

// Utility: Auto-format NPI (National Provider ID) input
function formatNPI(value) {
    if (!value) return "";
    return value.replace(/\D/g, "").slice(0, 10);  // Keep only numbers (max 10 digits)
}

// Validate form before submission
function validateForm() {
    const requiredFields = ['billingName', 'tin', 'npi', 'billingAddress1', 'billingCity', 'billingState', 'billingZip'];
    let isValid = true;

    requiredFields.forEach(field => {
        const input = document.getElementById(field);
        if (!input.value.trim()) {
            input.classList.add('is-invalid'); // Bootstrap validation style
            isValid = false;
        } else {
            input.classList.remove('is-invalid');
        }
    });

    return isValid;
}

async function saveProviderChanges() {
    if (!validateForm()) {
        showAlert('Please fill in all required fields.', 'error');
        return;
    }

    const primaryKey = document.getElementById('primaryKey').value;
    if (!primaryKey) {
        alert('Invalid provider selection.');
        return;
    }

    const updates = {
        "Billing Name": document.getElementById('billingName').value.trim(),
        "TIN": formatTIN(document.getElementById('tin').value.trim()),
        "NPI": formatNPI(document.getElementById('npi').value.trim()),
        "Billing Address 1": document.getElementById('billingAddress1').value.trim(),
        "Billing Address City": document.getElementById('billingCity').value.trim(),
        "Billing Address State": document.getElementById('billingState').value.trim(),
        "Billing Address Postal Code": document.getElementById('billingZip').value.trim(),
        "Provider Type": document.getElementById('providerType').value.trim(),
        "Provider Network": document.getElementById('providerNetwork').value.trim(),
        "Provider Status": document.getElementById('providerStatus').value.trim()
    };

    try {
        const response = await fetch('/provider_corrections/api/provider/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ primary_key: primaryKey, updates })
        });

        const data = await response.json();
        if (data.success) {
            showAlert(data.message, 'success');
        } else {
            showAlert(data.error || 'Failed to update provider.', 'error');
        }
    } catch (error) {
        console.error('Error updating provider:', error);
        showAlert('Error updating provider.', 'error');
    }
}


// Attach event listener to save button
document.getElementById('saveProviderButton').addEventListener('click', saveProviderChanges);

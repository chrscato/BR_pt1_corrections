/**
 * Provider editor functionality - Improved UX with PDF loading fixes
 * Handles displaying and updating provider details with better validation
 */

document.addEventListener("DOMContentLoaded", function () {
    console.log("Setting up provider editor event listeners...");
    setupProviderEditorEventListeners();
});

function setupProviderEditorEventListeners() {
    const saveButton = document.getElementById('saveProviderButton');
    if (saveButton) {
        saveButton.addEventListener('click', saveProviderChanges);
    }
    
    // Set up tab click handlers
    const footerTab = document.getElementById('footer-tab');
    const headerTab = document.getElementById('header-tab');
    
    if (footerTab) {
        footerTab.addEventListener('click', function() {
            const fileName = document.getElementById('selectedFileName').textContent;
            if (fileName !== 'No file selected') {
                loadFooterRegion(fileName);
            }
        });
    }
    
    if (headerTab) {
        headerTab.addEventListener('click', function() {
            const fileName = document.getElementById('selectedFileName').textContent;
            if (fileName !== 'No file selected') {
                loadHeaderRegion(fileName);
            }
        });
    }
}

function loadProviderDetails(provider) {
    console.log(`Loading details for provider: ${provider.PrimaryKey}`);

    const providerInfo = document.getElementById('providerInfo');
    const providerEditor = document.getElementById('providerEditor');
    
    if (providerInfo) providerInfo.classList.add('d-none');
    if (providerEditor) providerEditor.classList.remove('d-none');

    // Populate text fields
    document.getElementById('primaryKey').value = provider.PrimaryKey || '';
    document.getElementById('dbaName').value = provider['DBA Name Billing Name'] || '';
    document.getElementById('billingName').value = provider['Billing Name'] || provider['DBA Name Billing Name'] || '';
    document.getElementById('tin').value = formatTIN(provider.TIN);
    document.getElementById('npi').value = formatNPI(provider.NPI);
    
    // Ensure we're using Billing Address fields specifically
    document.getElementById('billingAddress1').value = provider['Billing Address 1'] || '';
    document.getElementById('billingAddress2').value = provider['Billing Address 2'] || '';
    document.getElementById('billingCity').value = provider['Billing Address City'] || '';
    document.getElementById('billingState').value = provider['Billing Address State'] || '';
    document.getElementById('billingZip').value = provider['Billing Address Postal Code'] || '';

    // Prepopulate dropdowns
    setDropdownValue('providerType', provider['Provider Type']);
    setDropdownValue('providerNetwork', provider['Provider Network']);
    setDropdownValue('providerStatus', provider['Provider Status']);

    // Load PDF preview - first set the filename display
    if (provider.file_name) {
        document.getElementById('selectedFileName').textContent = provider.file_name;
        
        // Load the PDF and regions
        loadPDFFooter(provider.file_name);
        loadFooterRegion(provider.file_name);
        loadHeaderRegion(provider.file_name);
    }
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

/**
 * Load the main PDF with fallback paths
 */
async function loadPDFFooter(filePath) {
    if (!filePath) {
        console.warn("No associated PDF file found.");
        return;
    }

    // Extract the filename, remove the full path
    const fileName = filePath.split('\\').pop().split('/').pop().replace('.json', '.pdf');
    console.log(`Fetching PDF: /provider_corrections/api/pdf/${fileName}`);

    try {
        // Try multiple potential PDF paths
        const possiblePaths = [
            `/provider_corrections/api/pdf/${fileName}`,
            `/corrections/api/pdf/${fileName}`,
            `/unmapped/api/pdf/${fileName}`,
            `/escalations/api/pdf/${fileName}`,
            `/api/pdf/${fileName}`
        ];

        // Also try with the base filename (without extension)
        const baseFileName = fileName.split('.')[0] + '.pdf';
        possiblePaths.push(
            `/provider_corrections/api/pdf/${baseFileName}`,
            `/corrections/api/pdf/${baseFileName}`,
            `/unmapped/api/pdf/${baseFileName}`,
            `/escalations/api/pdf/${baseFileName}`
        );

        let foundPDF = false;
        
        for (const path of possiblePaths) {
            try {
                const response = await fetch(path, { method: 'HEAD' });
                if (response.ok) {
                    console.log(`Found PDF at: ${path}`);
                    const pdfFrame = document.getElementById('pdfFrame');
                    if (pdfFrame) {
                        pdfFrame.src = path;
                        foundPDF = true;
                        break;
                    }
                }
            } catch (err) {
                console.log(`Path ${path} not available`);
            }
        }
        
        if (!foundPDF) {
            throw new Error(`PDF not found at any location`);
        }
    } catch (error) {
        console.error(`Error loading PDF: ${error}`);
        
        // Show error message in the PDF frame
        const pdfFrame = document.getElementById('pdfFrame');
        if (pdfFrame) {
            pdfFrame.src = "about:blank";
            const parentElement = pdfFrame.parentElement;
            if (parentElement) {
                const errorMessage = document.createElement('div');
                errorMessage.className = 'alert alert-danger mt-0 mb-0 p-1';
                errorMessage.innerHTML = `
                    <small><strong>PDF not found</strong>
                    The PDF file could not be located.</small>
                `;
                parentElement.appendChild(errorMessage);
            }
        }
    }
}

/**
 * Load the footer region of the PDF
 * @param {string} filename - The filename to load
 */
function loadFooterRegion(filename) {
    const footerImage = document.getElementById('footerImage');
    if (!footerImage) return;
    
    footerImage.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MCA1MCIgd2lkdGg9IjUwcHgiIGhlaWdodD0iNTBweCI+CiAgPGNpcmNsZSBjeD0iMjUiIGN5PSIyNSIgcj0iMjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwNzJmZiIgc3Ryb2tlLXdpZHRoPSI1Ij4KICAgIDxhbmltYXRlVHJhbnNmb3JtIGF0dHJpYnV0ZU5hbWU9InRyYW5zZm9ybSIgdHlwZT0icm90YXRlIiBkdXI9IjFzIiByZXBlYXRDb3VudD0iaW5kZWZpbml0ZSIgZnJvbT0iMCAyNSAyNSIgdG89IjM2MCAyNSAyNSIvPgogIDwvY2lyY2xlPgo8L3N2Zz4=";
    
    const routes = [
        '/unmapped/api/pdf_region/',
        '/corrections/api/pdf_region/',
        '/escalations/api/pdf_region/'
    ];
    
    tryLoadRegion(routes, filename, 'footer', footerImage);
}

/**
 * Load the header region of the PDF
 * @param {string} filename - The filename to load
 */
function loadHeaderRegion(filename) {
    const headerImage = document.getElementById('headerImage');
    if (!headerImage) return;
    
    headerImage.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MCA1MCIgd2lkdGg9IjUwcHgiIGhlaWdodD0iNTBweCI+CiAgPGNpcmNsZSBjeD0iMjUiIGN5PSIyNSIgcj0iMjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwNzJmZiIgc3Ryb2tlLXdpZHRoPSI1Ij4KICAgIDxhbmltYXRlVHJhbnNmb3JtIGF0dHJpYnV0ZU5hbWU9InRyYW5zZm9ybSIgdHlwZT0icm90YXRlIiByZXBlYXRDb3VudD0iaW5kZWZpbml0ZSIgZHVyPSIxcyIgZnJvbT0iMCAyNSAyNSIgdG89IjM2MCAyNSAyNSIvPgogIDwvY2lyY2xlPgo8L3N2Zz4=";
    
    const routes = [
        '/unmapped/api/pdf_region/',
        '/corrections/api/pdf_region/',
        '/escalations/api/pdf_region/'
    ];
    
    tryLoadRegion(routes, filename, 'header', headerImage);
}

/**
 * Try multiple routes to load a PDF region
 * @param {Array} routes - Array of route prefixes to try
 * @param {string} filename - The filename to load
 * @param {string} region - The region name (header/footer)
 * @param {HTMLImageElement} imgElement - The image element to update
 */
async function tryLoadRegion(routes, filename, region, imgElement) {
    // First clean the filename
    const cleanFilename = filename.split('\\').pop().split('/').pop();
    
    // Try both with and without .json extension
    const filenameVariations = [
        cleanFilename,
        cleanFilename.replace('.json', ''),
        cleanFilename.replace('.pdf', '') + '.json'
    ];
    
    let loaded = false;
    
    // Try all routes and filename variations
    for (const route of routes) {
        for (const fileVar of filenameVariations) {
            try {
                const url = `${route}${fileVar}/${region}`;
                console.log(`Trying to load ${region} from ${url}`);
                
                const response = await fetch(url);
                if (response.ok) {
                    const data = await response.json();
                    if (data.image) {
                        imgElement.src = data.image;
                        console.log(`${region} loaded successfully from ${url}`);
                        loaded = true;
                        return;
                    }
                }
            } catch (error) {
                console.log(`Failed to load from ${route} with filename ${fileVar}: ${error.message}`);
            }
        }
    }
    
    // If all attempts fail
    if (!loaded) {
        imgElement.src = '/static/img/error.png';
        const container = imgElement.parentElement;
        if (container) {
            // Remove any existing error messages
            const existingErrors = container.querySelectorAll('.alert');
            existingErrors.forEach(el => el.remove());
            
            const errorEl = document.createElement('div');
            errorEl.className = 'alert alert-warning m-0 p-1';
            errorEl.style.position = 'absolute';
            errorEl.style.bottom = '0';
            errorEl.style.left = '0';
            errorEl.style.right = '0';
            errorEl.innerHTML = `
                <small>Could not load ${region}. 
                <button class="btn btn-sm btn-primary py-0 px-1" onclick="document.getElementById('full-tab').click()">
                    View Full PDF
                </button></small>
            `;
            container.appendChild(errorEl);
        }
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
        "Billing Address 2": document.getElementById('billingAddress2').value.trim() || null,
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

/**
 * Show an alert message that automatically disappears
 * @param {string} message - The message to display
 * @param {string} type - Alert type ('success', 'error', 'info', 'warning')
 * @param {number} duration - Duration in milliseconds
 */
function showAlert(message, type = 'success', duration = 3000) {
    // Create the alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    alertDiv.style.padding = '2px 5px';
    alertDiv.style.fontSize = '0.8rem';
    
    // Add the message
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" style="padding: 2px 3px;" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Add to the document
    document.body.appendChild(alertDiv);
    
    // Remove after the specified duration
    setTimeout(() => {
        alertDiv.classList.remove('show');
        setTimeout(() => {
            alertDiv.remove();
        }, 300);
    }, duration);
}




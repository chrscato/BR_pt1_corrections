/**
 * Enhanced PDF Region Viewer for Provider Corrections tool
 * - Fixes the header and footer region loading issues
 * - Fixes PDF file path handling issues
 * - Reorganizes tabs to footer, full PDF, header order
 */

// Store the selected filename globally
let selectedFilename = null;

document.addEventListener("DOMContentLoaded", function() {
    console.log("Enhanced PDF viewer initialized");
    setupTabEventHandlers();
});

/**
 * Set up better event handlers for tab switching
 */
function setupTabEventHandlers() {
    // Add click event listeners directly to the tabs
    const footerTab = document.getElementById('footer-tab');
    const fullTab = document.getElementById('full-tab');
    const headerTab = document.getElementById('header-tab');
    
    if (footerTab) {
        footerTab.addEventListener('click', function() {
            if (selectedFilename) {
                loadFooterRegion(selectedFilename);
            }
        });
    }
    
    if (headerTab) {
        headerTab.addEventListener('click', function() {
            if (selectedFilename) {
                loadHeaderRegion(selectedFilename);
            }
        });
    }
}

/**
 * Fix the filename format for API requests
 * @param {string} filename - The original filename
 * @returns {string} - The properly formatted filename for API requests
 */
function formatFilenameForAPI(filename) {
    // Extract just the filename without path
    let formattedName = filename;
    
    // Remove any path components if present
    if (formattedName.includes('/') || formattedName.includes('\\')) {
        const parts = formattedName.split(/[\/\\]/);
        formattedName = parts[parts.length - 1];
    }
    
    // Ensure it has a proper extension
    if (!formattedName.toLowerCase().endsWith('.json') && 
        !formattedName.toLowerCase().endsWith('.pdf')) {
        formattedName += '.json'; // Add JSON extension as default
    }
    
    console.log(`Formatted filename for API: ${formattedName}`);
    return formattedName;
}

/**
 * Load a specific PDF file and regions
 * @param {string} filename - The filename to load
 */
function loadPDFFile(filename) {
    console.log(`Loading PDF for file: ${filename}`);
    selectedFilename = filename;
    
    // Format the filename for API requests
    const apiFilename = formatFilenameForAPI(filename);
    
    // Set the selected filename display
    const filenameDisplay = document.getElementById('selectedFileName');
    if (filenameDisplay) {
        filenameDisplay.textContent = filename;
    }
    
    // First load the footer (since it's now the active tab)
    loadFooterRegion(apiFilename);
    
    // Set up the full PDF view - try multiple PDF path formats
    loadFullPDF(apiFilename);
    
    // Also pre-load the header region
    loadHeaderRegion(apiFilename);
}

/**
 * Try different formats to load the full PDF
 * @param {string} filename - The formatted filename
 */
function loadFullPDF(filename) {
    const pdfFrame = document.getElementById('pdfFrame');
    if (!pdfFrame) return;
    
    // Try with the direct filename
    let pdfPath = `/provider_corrections/api/pdf/${filename}`;
    
    // If filename ends with .json, try the PDF version
    if (filename.toLowerCase().endsWith('.json')) {
        // Convert .json to .pdf
        pdfPath = `/provider_corrections/api/pdf/${filename.slice(0, -5)}.pdf`;
    }
    
    console.log(`Loading full PDF from: ${pdfPath}`);
    pdfFrame.src = pdfPath;
    
    // Add error handler to try alternative paths if the first one fails
    pdfFrame.onerror = function() {
        console.log("Initial PDF load failed, trying alternative paths");
        tryAlternativePDFPaths(filename, pdfFrame);
    };
}

/**
 * Try alternative PDF paths if the main one fails
 * @param {string} filename - The formatted filename
 * @param {HTMLIFrameElement} pdfFrame - The PDF iframe element
 */
async function tryAlternativePDFPaths(filename, pdfFrame) {
    // Try alternative paths from different routes
    const alternativePaths = [
        // Try without extension
        `/provider_corrections/api/pdf/${filename.split('.')[0]}`,
        // Try with PDF extension
        `/provider_corrections/api/pdf/${filename.split('.')[0]}.pdf`,
        // Try corrections route
        `/corrections/api/pdf/${filename}`,
        // Try corrections route with PDF extension
        `/corrections/api/pdf/${filename.split('.')[0]}.pdf`,
        // Try unmapped route
        `/unmapped/api/pdf/${filename}`,
        // Try unmapped route with PDF extension
        `/unmapped/api/pdf/${filename.split('.')[0]}.pdf`,
        // Try escalations route
        `/escalations/api/pdf/${filename}`,
        // Try escalations route with PDF extension
        `/escalations/api/pdf/${filename.split('.')[0]}.pdf`
    ];
    
    console.log("Trying alternative PDF paths...");
    
    // Try each path until one works
    for (const path of alternativePaths) {
        console.log(`Trying PDF path: ${path}`);
        
        try {
            // Check if the path is accessible
            const response = await fetch(path, { method: 'HEAD' });
            if (response.ok) {
                console.log(`Found working PDF path: ${path}`);
                pdfFrame.src = path;
                return;
            }
        } catch (error) {
            console.log(`Path ${path} failed: ${error.message}`);
        }
    }
    
    // If all paths fail, show an error message
    console.error("All PDF paths failed");
    const fullTab = document.getElementById('full-pdf');
    if (fullTab) {
        fullTab.innerHTML = `
            <div class="alert alert-danger m-3">
                <h5>PDF Not Found</h5>
                <p>The PDF for this file could not be located. This could be due to:</p>
                <ul>
                    <li>The PDF file doesn't exist in the system</li>
                    <li>The filename format is not recognized</li>
                    <li>There may be a path configuration issue</li>
                </ul>
                <p>Please check the file paths in your configuration.</p>
            </div>
        `;
    }
}

/**
 * Load the footer region from a PDF
 * @param {string} filename - The filename to load
 */
async function loadFooterRegion(filename) {
    try {
        console.log(`Loading footer region for: ${filename}`);
        const footerImage = document.getElementById('footerImage');
        const statusDiv = document.getElementById('footerRegionStatus');
        
        if (!footerImage) {
            console.error("Footer image element not found");
            return;
        }
        
        // Set a loading spinner
        footerImage.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MCA1MCIgd2lkdGg9IjUwcHgiIGhlaWdodD0iNTBweCI+CiAgPGNpcmNsZSBjeD0iMjUiIGN5PSIyNSIgcj0iMjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwNzJmZiIgc3Ryb2tlLXdpZHRoPSI1Ij4KICAgIDxhbmltYXRlVHJhbnNmb3JtIGF0dHJpYnV0ZU5hbWU9InRyYW5zZm9ybSIgdHlwZT0icm90YXRlIiBkdXI9IjFzIiByZXBlYXRDb3VudD0iaW5kZWZpbml0ZSIgZnJvbT0iMCAyNSAyNSIgdG89IjM2MCAyNSAyNSIvPgogIDwvY2lyY2xlPgo8L3N2Zz4=";
        if (statusDiv) {
            statusDiv.innerHTML = '<div class="alert alert-info">Loading footer region...</div>';
        }
        
        // First try with provider_corrections route
        const response = await fetch(`/provider_corrections/api/pdf_region/${filename}/footer`);
        
        if (response.ok) {
            const data = await response.json();
            if (data.image) {
                footerImage.src = data.image;
                console.log("Footer image loaded successfully");
                if (statusDiv) {
                    statusDiv.innerHTML = '';
                }
                return;
            }
        }
        
        // If that fails, try unmapped route
        const unmappedResponse = await fetch(`/unmapped/api/pdf_region/${filename}/footer`);
        
        if (unmappedResponse.ok) {
            const data = await unmappedResponse.json();
            if (data.image) {
                footerImage.src = data.image;
                console.log("Footer image loaded successfully from unmapped route");
                if (statusDiv) {
                    statusDiv.innerHTML = '';
                }
                return;
            }
        }
        
        // If both fail, throw an error
        throw new Error("No image data returned for footer");
    } catch (error) {
        console.error("Error loading footer:", error);
        const footerImage = document.getElementById('footerImage');
        const statusDiv = document.getElementById('footerRegionStatus');
        
        if (footerImage) {
            footerImage.src = '/static/img/error.png';
        }
        
        if (statusDiv) {
            statusDiv.innerHTML = `
                <div class="alert alert-warning">
                    <p>Could not load footer region. Trying alternative methods...</p>
                </div>
            `;
            
            // Try to load via a different route
            tryAlternativeRegionLoad(filename, 'footer', footerImage, statusDiv);
        }
    }
}

/**
 * Load the header region from a PDF
 * @param {string} filename - The filename to load
 */
async function loadHeaderRegion(filename) {
    try {
        console.log(`Loading header region for: ${filename}`);
        const headerImage = document.getElementById('headerImage');
        const statusDiv = document.getElementById('headerRegionStatus');
        
        if (!headerImage) {
            console.error("Header image element not found");
            return;
        }
        
        // Set a loading spinner
        headerImage.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MCA1MCIgd2lkdGg9IjUwcHgiIGhlaWdodD0iNTBweCI+CiAgPGNpcmNsZSBjeD0iMjUiIGN5PSIyNSIgcj0iMjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwNzJmZiIgc3Ryb2tlLXdpZHRoPSI1Ij4KICAgIDxhbmltYXRlVHJhbnNmb3JtIGF0dHJpYnV0ZU5hbWU9InRyYW5zZm9ybSIgdHlwZT0icm90YXRlIiByZXBlYXRDb3VudD0iaW5kZWZpbml0ZSIgZHVyPSIxcyIgZnJvbT0iMCAyNSAyNSIgdG89IjM2MCAyNSAyNSIvPgogIDwvY2lyY2xlPgo8L3N2Zz4=";
        if (statusDiv) {
            statusDiv.innerHTML = '<div class="alert alert-info">Loading header region...</div>';
        }
        
        // First try with provider_corrections route
        const response = await fetch(`/provider_corrections/api/pdf_region/${filename}/header`);
        
        if (response.ok) {
            const data = await response.json();
            if (data.image) {
                headerImage.src = data.image;
                console.log("Header image loaded successfully");
                if (statusDiv) {
                    statusDiv.innerHTML = '';
                }
                return;
            }
        }
        
        // If that fails, try unmapped route
        const unmappedResponse = await fetch(`/unmapped/api/pdf_region/${filename}/header`);
        
        if (unmappedResponse.ok) {
            const data = await unmappedResponse.json();
            if (data.image) {
                headerImage.src = data.image;
                console.log("Header image loaded successfully from unmapped route");
                if (statusDiv) {
                    statusDiv.innerHTML = '';
                }
                return;
            }
        }
        
        // If both fail, throw an error
        throw new Error("No image data returned for header");
    } catch (error) {
        console.error("Error loading header:", error);
        const headerImage = document.getElementById('headerImage');
        const statusDiv = document.getElementById('headerRegionStatus');
        
        if (headerImage) {
            headerImage.src = '/static/img/error.png';
        }
        
        if (statusDiv) {
            statusDiv.innerHTML = `
                <div class="alert alert-warning">
                    <p>Could not load header region. Trying alternative methods...</p>
                </div>
            `;
            
            // Try to load via a different route
            tryAlternativeRegionLoad(filename, 'header', headerImage, statusDiv);
        }
    }
}

/**
 * Try an alternative method to load PDF regions
 * First try with corrections route, then with escalations route
 * @param {string} filename - The filename to load
 * @param {string} region - The region to load ('header' or 'footer')
 * @param {HTMLImageElement} imgElement - The image element to update
 * @param {HTMLElement} statusDiv - The status div to update
 */
async function tryAlternativeRegionLoad(filename, region, imgElement, statusDiv) {
    try {
        // Try corrections route first
        console.log(`Trying alternative route for ${region}: corrections`);
        if (statusDiv) {
            statusDiv.innerHTML = `<div class="alert alert-info">Trying alternative method 1...</div>`;
        }
        
        const response = await fetch(`/corrections/api/pdf_region/${filename}/${region}`);
        
        if (response.ok) {
            const data = await response.json();
            if (data.image) {
                imgElement.src = data.image;
                console.log(`${region} loaded via corrections route`);
                if (statusDiv) {
                    statusDiv.innerHTML = `<div class="alert alert-success">Successfully loaded via alternative method</div>`;
                }
                return;
            }
        }
        
        // If that fails, try escalations route
        console.log(`Trying alternative route for ${region}: escalations`);
        if (statusDiv) {
            statusDiv.innerHTML = `<div class="alert alert-info">Trying alternative method 2...</div>`;
        }
        
        const response2 = await fetch(`/escalations/api/pdf_region/${filename}/${region}`);
        
        if (response2.ok) {
            const data = await response2.json();
            if (data.image) {
                imgElement.src = data.image;
                console.log(`${region} loaded via escalations route`);
                if (statusDiv) {
                    statusDiv.innerHTML = `<div class="alert alert-success">Successfully loaded via alternative method</div>`;
                }
                return;
            }
        }
        
        // Try with file basename only (without extension)
        const baseName = filename.split('.')[0];
        console.log(`Trying with base filename: ${baseName}`);
        if (statusDiv) {
            statusDiv.innerHTML = `<div class="alert alert-info">Trying with simplified filename...</div>`;
        }
        
        const response3 = await fetch(`/unmapped/api/pdf_region/${baseName}/${region}`);
        
        if (response3.ok) {
            const data = await response3.json();
            if (data.image) {
                imgElement.src = data.image;
                console.log(`${region} loaded via unmapped route with base filename`);
                if (statusDiv) {
                    statusDiv.innerHTML = `<div class="alert alert-success">Successfully loaded via alternative method</div>`;
                }
                return;
            }
        }
        
        // If all fails, display a full PDF viewer button
        if (statusDiv) {
            statusDiv.innerHTML = `
                <div class="alert alert-danger">
                    <p>All methods to load ${region} region failed.</p>
                    <p>Please check the full PDF view instead.</p>
                    <button class="btn btn-primary btn-sm mt-2" onclick="document.getElementById('full-tab').click()">
                        View Full PDF
                    </button>
                </div>
            `;
        }
    } catch (error) {
        console.error(`Error in alternative loading for ${region}:`, error);
        if (statusDiv) {
            statusDiv.innerHTML = `
                <div class="alert alert-danger">
                    <p>Error loading ${region} region: ${error.message}</p>
                    <p>Please check the full PDF view instead.</p>
                    <button class="btn btn-primary btn-sm mt-2" onclick="document.getElementById('full-tab').click()">
                        View Full PDF
                    </button>
                </div>
            `;
        }
    }
}

// Override the viewFile function to use our enhanced loader
window.viewFile = function(fileName) {
    console.log(`Viewing file: ${fileName}`);
    loadPDFFile(fileName);
};

// Export functions to global scope to make them available to other modules
window.loadPDFFile = loadPDFFile;
window.loadHeaderRegion = loadHeaderRegion;
window.loadFooterRegion = loadFooterRegion;
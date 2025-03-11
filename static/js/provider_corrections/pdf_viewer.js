/**
 * Fixed PDF Viewer for Provider Corrections
 * This script ensures the PDF regions (especially footer) are properly displayed
 */

// Global variables to track state
let currentFilename = null;
let pdfViewerInitialized = false;

// Initialize the PDF viewer when the document is ready
document.addEventListener('DOMContentLoaded', function() {
  initPDFViewer();
});

/**
 * Initialize the PDF viewer
 */
function initPDFViewer() {
  if (pdfViewerInitialized) return;
  
  console.log('Initializing PDF Viewer');
  
  // Set up tab event listeners
  setupTabListeners();
  
  // Make footer tab active by default
  setTimeout(() => {
    const footerTab = document.getElementById('footer-tab');
    if (footerTab && !footerTab.classList.contains('active')) {
      footerTab.click();
    }
  }, 300);
  
  pdfViewerInitialized = true;
}

/**
 * Set up tab listeners
 */
function setupTabListeners() {
  const footerTab = document.getElementById('footer-tab');
  const fullTab = document.getElementById('full-tab');
  const headerTab = document.getElementById('header-tab');
  
  if (footerTab) {
    footerTab.addEventListener('click', function() {
      loadRegion('footer');
    });
  }
  
  if (headerTab) {
    headerTab.addEventListener('click', function() {
      loadRegion('header');
    });
  }
  
  if (fullTab) {
    fullTab.addEventListener('click', function() {
      loadFullPDF();
    });
  }
}

/**
 * Set the current filename and load appropriate content
 */
function setCurrentFile(filename) {
  currentFilename = filename;
  console.log(`Setting current file to: ${filename}`);
  
  // Update the filename display
  const filenameDisplay = document.getElementById('selectedFileName');
  if (filenameDisplay) {
    filenameDisplay.textContent = filename;
  }
  
  // Load the active tab content
  const activeTab = document.querySelector('#regionTabs .nav-link.active');
  if (activeTab) {
    if (activeTab.id === 'footer-tab') {
      loadRegion('footer');
    } else if (activeTab.id === 'header-tab') {
      loadRegion('header');
    } else {
      loadFullPDF();
    }
  } else {
    // Default to footer if no tab is active
    loadRegion('footer');
  }
}

/**
 * Load a PDF region (footer or header)
 */
function loadRegion(region) {
  if (!currentFilename || currentFilename === 'No file selected') {
    console.log('No file selected, cannot load region');
    return;
  }
  
  console.log(`Loading ${region} region for: ${currentFilename}`);
  
  // Get the image element
  const imgId = `${region}Image`;
  const imgElement = document.getElementById(imgId);
  if (!imgElement) {
    console.error(`Image element not found: ${imgId}`);
    return;
  }
  
  // Show loading state
  imgElement.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MCA1MCIgd2lkdGg9IjUwcHgiIGhlaWdodD0iNTBweCI+CiAgPGNpcmNsZSBjeD0iMjUiIGN5PSIyNSIgcj0iMjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwNzJmZiIgc3Ryb2tlLXdpZHRoPSI1Ij4KICAgIDxhbmltYXRlVHJhbnNmb3JtIGF0dHJpYnV0ZU5hbWU9InRyYW5zZm9ybSIgdHlwZT0icm90YXRlIiBkdXI9IjFzIiByZXBlYXRDb3VudD0iaW5kZWZpbml0ZSIgZnJvbT0iMCAyNSAyNSIgdG89IjM2MCAyNSAyNSIvPgogIDwvY2lyY2xlPgo8L3N2Zz4=";
  
  // Clear any previous error messages
  const statusDivId = `${region}RegionStatus`;
  const statusDiv = document.getElementById(statusDivId);
  if (statusDiv) {
    statusDiv.innerHTML = '';
  }
  
  // Try to load the region using multiple paths
  tryMultipleRegionAPIPaths(currentFilename, region, imgElement, statusDiv);
}

/**
 * Try multiple API paths to load a PDF region
 */
async function tryMultipleRegionAPIPaths(filename, region, imgElement, statusDiv) {
  // Clean filename (remove path components if any)
  const cleanFilename = filename.split('\\').pop().split('/').pop();
  
  // Generate variations of the filename
  const filenameVariations = [
    cleanFilename,
    cleanFilename.replace('.json', ''),
    cleanFilename.replace('.pdf', '') + '.json',
    cleanFilename + '.json',
    cleanFilename + '.pdf'
  ];
  
  // Different API routes to try for PDF region extraction
  const apiRoutes = [
    '/provider_corrections/api/pdf_region/',
    '/unmapped/api/pdf_region/',
    '/corrections/api/pdf_region/',
    '/escalations/api/pdf_region/'
  ];
  
  let success = false;

  // Try each route with each filename variation
  for (const route of apiRoutes) {
    for (const fileVar of filenameVariations) {
      try {
        const url = `${route}${fileVar}/${region}`;
        console.log(`Trying to load ${region} from: ${url}`);
        
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (data.image) {
            console.log(`Successfully loaded ${region} from: ${url}`);
            imgElement.src = data.image;
            success = true;
            return;
          }
        }
      } catch (error) {
        console.log(`Error with ${route} and ${fileVar}: ${error.message}`);
      }
    }
  }
  
  // If all attempts fail, display error
  if (!success) {
    imgElement.src = '/static/img/error.png';
    console.error(`Failed to load ${region} region for ${filename}`);
    
    // Show error message
    if (statusDiv) {
      statusDiv.innerHTML = `
        <div class="alert alert-warning mt-2">
          <p>Could not load ${region} region. Try viewing the full PDF instead.</p>
          <button class="btn btn-sm btn-primary mt-1" onclick="document.getElementById('full-tab').click()">
            View Full PDF
          </button>
        </div>
      `;
    }
  }
}

/**
 * Load the full PDF
 */
function loadFullPDF() {
  if (!currentFilename || currentFilename === 'No file selected') {
    console.log('No file selected, cannot load PDF');
    return;
  }
  
  console.log(`Loading full PDF for: ${currentFilename}`);
  
  const pdfFrame = document.getElementById('pdfFrame');
  if (!pdfFrame) {
    console.error('PDF frame element not found');
    return;
  }
  
  // Clear any existing PDFs and show loading state
  pdfFrame.src = "about:blank";
  
  // Remove any previous error messages
  const container = pdfFrame.parentElement;
  if (container) {
    const existingErrors = container.querySelectorAll('.alert');
    existingErrors.forEach(error => error.remove());
  }
  
  // Try to load the PDF using multiple paths
  tryMultiplePDFPaths(currentFilename, pdfFrame);
}

/**
 * Try multiple paths to load the full PDF
 */
async function tryMultiplePDFPaths(filename, pdfFrame) {
  // Clean filename
  const cleanFilename = filename.split('\\').pop().split('/').pop();
  
  // Generate filename variations
  const filenameVariations = [
    cleanFilename,
    cleanFilename.replace('.json', '.pdf'),
    cleanFilename.replace('.pdf', '.pdf'),
    cleanFilename + '.pdf'
  ];
  
  // Different API routes to try
  const apiRoutes = [
    '/provider_corrections/api/pdf/',
    '/unmapped/api/pdf/',
    '/corrections/api/pdf/',
    '/escalations/api/pdf/'
  ];
  
  let success = false;
  
  // Try each route with each filename variation
  for (const route of apiRoutes) {
    for (const fileVar of filenameVariations) {
      try {
        const url = `${route}${fileVar}`;
        console.log(`Trying to load PDF from: ${url}`);
        
        // Test if the URL is accessible
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) {
          console.log(`Successfully found PDF at: ${url}`);
          pdfFrame.src = url;
          success = true;
          return;
        }
      } catch (error) {
        console.log(`Error with ${route} and ${fileVar}: ${error.message}`);
      }
    }
  }
  
  // If all attempts fail, display error
  if (!success) {
    console.error(`Failed to load PDF for ${filename}`);
    
    // Show error message in the PDF frame's parent
    const container = pdfFrame.parentElement;
    if (container) {
      const errorMsg = document.createElement('div');
      errorMsg.className = 'alert alert-danger m-3';
      errorMsg.innerHTML = `
        <h5>PDF Not Found</h5>
        <p>The PDF file could not be located. Possible reasons:</p>
        <ul>
          <li>The PDF file doesn't exist in the system</li>
          <li>The filename format is not recognized</li>
          <li>There may be a configuration issue with the file paths</li>
        </ul>
      `;
      container.appendChild(errorMsg);
    }
  }
}

/**
 * Helper function to load a specific provider's PDF
 */
function viewProviderPDF(provider) {
  if (provider && provider.file_name) {
    setCurrentFile(provider.file_name);
  }
}

// Expose global functions
window.setCurrentFile = setCurrentFile;
window.loadRegion = loadRegion;
window.loadFullPDF = loadFullPDF;
window.viewProviderPDF = viewProviderPDF;
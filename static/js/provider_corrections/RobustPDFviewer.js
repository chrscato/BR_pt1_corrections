/**
 * RobustPDFViewer.js
 * A reliable PDF viewer for the Provider Corrections tool that handles multiple paths
 * and ensures PDF regions (especially footer) are properly displayed
 */

class RobustPDFViewer {
    constructor() {
      this.currentFilename = null;
      this.apiPaths = [
        '/provider_corrections/api/',
        '/unmapped/api/',
        '/corrections/api/',
        '/escalations/api/'
      ];
      this.regionNames = ['footer', 'header'];
      this.initialized = false;
    }
  
    /**
     * Initialize the PDF viewer
     */
    init() {
      if (this.initialized) return;
      
      console.log('Initializing Robust PDF Viewer');
      
      // Set up tab event listeners
      this._setupTabListeners();
      
      // Force footer tab to be active on startup
      setTimeout(() => {
        const footerTab = document.getElementById('footer-tab');
        if (footerTab && !footerTab.classList.contains('active')) {
          footerTab.click();
        }
      }, 200);
      
      this.initialized = true;
    }
  
    /**
     * Set up tab listeners for the PDF viewer
     * @private
     */
    _setupTabListeners() {
      // Listen for tab changes
      const tabs = {
        footer: document.getElementById('footer-tab'),
        header: document.getElementById('header-tab'),
        full: document.getElementById('full-tab')
      };
      
      if (tabs.footer) {
        tabs.footer.addEventListener('click', () => {
          this.loadRegion('footer');
        });
      }
      
      if (tabs.header) {
        tabs.header.addEventListener('click', () => {
          this.loadRegion('header');
        });
      }
      
      if (tabs.full) {
        tabs.full.addEventListener('click', () => {
          this.loadFullPDF();
        });
      }
    }
  
    /**
     * Set the current filename
     * @param {string} filename - The filename to use
     */
    setFilename(filename) {
      this.currentFilename = filename;
      console.log(`RobustPDFViewer: Set filename to ${filename}`);
      
      // Update the filename display
      const filenameDisplay = document.getElementById('selectedFileName');
      if (filenameDisplay) {
        filenameDisplay.textContent = filename;
      }
      
      // Load the appropriate content based on active tab
      const activeTab = document.querySelector('#regionTabs .nav-link.active');
      if (activeTab) {
        if (activeTab.id === 'footer-tab') {
          this.loadRegion('footer');
        } else if (activeTab.id === 'header-tab') {
          this.loadRegion('header');
        } else if (activeTab.id === 'full-tab') {
          this.loadFullPDF();
        }
      } else {
        // Default to footer if no tab is active
        this.loadRegion('footer');
      }
    }
  
    /**
     * Load a specific PDF region
     * @param {string} region - The region to load ('footer' or 'header')
     */
    async loadRegion(region) {
      if (!this.currentFilename || this.currentFilename === 'No file selected') {
        console.log('No file selected, cannot load region');
        return;
      }
      
      console.log(`Loading ${region} region for: ${this.currentFilename}`);
      
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
      let success = await this._tryMultiplePaths(region, imgElement);
      
      // If all attempts fail, display error
      if (!success && statusDiv) {
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
  
    /**
     * Try multiple API paths to load a PDF region
     * @param {string} region - The region to load
     * @param {HTMLImageElement} imgElement - The image element to update
     * @returns {Promise<boolean>} - Whether the region was successfully loaded
     * @private
     */
    async _tryMultiplePaths(region, imgElement) {
      // Clean filename (remove path components)
      const cleanFilename = this.currentFilename.split('\\').pop().split('/').pop();
      
      // Generate filename variations
      const filenameVariations = [
        cleanFilename,
        cleanFilename.replace('.json', ''),
        cleanFilename.replace('.pdf', '') + '.json',
        cleanFilename + '.json',
        cleanFilename + '.pdf'
      ];
      
      // Try each API path with each filename variation
      for (const apiPath of this.apiPaths) {
        for (const fileVar of filenameVariations) {
          try {
            const url = `${apiPath}pdf_region/${fileVar}/${region}`;
            console.log(`Trying: ${url}`);
            
            const response = await fetch(url);
            if (response.ok) {
              const data = await response.json();
              if (data.image) {
                imgElement.src = data.image;
                console.log(`Successfully loaded ${region} from: ${url}`);
                return true;
              }
            }
          } catch (error) {
            console.log(`Error with ${apiPath} and ${fileVar}: ${error.message}`);
          }
        }
      }
      
      // All attempts failed
      console.error(`Failed to load ${region} region for ${this.currentFilename}`);
      imgElement.src = '/static/img/error.png';
      return false;
    }
  
    /**
     * Load the full PDF document
     */
    async loadFullPDF() {
      if (!this.currentFilename || this.currentFilename === 'No file selected') {
        console.log('No file selected, cannot load PDF');
        return;
      }
      
      console.log(`Loading full PDF for: ${this.currentFilename}`);
      
      const pdfFrame = document.getElementById('pdfFrame');
      if (!pdfFrame) {
        console.error('PDF frame element not found');
        return;
      }
      
      // Show loading indicator
      pdfFrame.src = "about:blank";
      
      // Try to load the PDF using multiple paths
      let success = await this._tryMultiplePDFPaths(pdfFrame);
      
      // If all attempts fail, display error
      if (!success) {
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
     * Try multiple paths to load the full PDF
     * @param {HTMLIFrameElement} pdfFrame - The iframe element to update
     * @returns {Promise<boolean>} - Whether the PDF was successfully loaded
     * @private
     */
    async _tryMultiplePDFPaths(pdfFrame) {
      // Clean filename
      const cleanFilename = this.currentFilename.split('\\').pop().split('/').pop();
      
      // Generate filename variations
      const filenameVariations = [
        cleanFilename,
        cleanFilename.replace('.json', '.pdf'),
        cleanFilename.replace('.pdf', '.pdf'),
        cleanFilename + '.pdf'
      ];
      
      // Try each API path with each filename variation
      for (const apiPath of this.apiPaths) {
        for (const fileVar of filenameVariations) {
          try {
            const url = `${apiPath}pdf/${fileVar}`;
            console.log(`Trying PDF: ${url}`);
            
            // Test if the URL is accessible
            const response = await fetch(url, { method: 'HEAD' });
            if (response.ok) {
              pdfFrame.src = url;
              console.log(`Successfully loaded PDF from: ${url}`);
              return true;
            }
          } catch (error) {
            console.log(`Error with ${apiPath} and ${fileVar}: ${error.message}`);
          }
        }
      }
      
      // All attempts failed
      console.error(`Failed to load PDF for ${this.currentFilename}`);
      return false;
    }
  }
  
  // Create a global instance
  window.pdfViewer = new RobustPDFViewer();
  
  // Initialize on page load
  document.addEventListener('DOMContentLoaded', () => {
    window.pdfViewer.init();
  });
  
  // Expose a function to load a file's PDF for external use
  window.loadFilePDF = function(filename) {
    window.pdfViewer.setFilename(filename);
  };
  
  // Add a helper function to select a provider and view its PDF
  window.selectProviderAndViewPDF = function(provider) {
    if (provider && provider.file_name) {
      window.pdfViewer.setFilename(provider.file_name);
    }
  };
/**
 * PDF viewing functionality for the Escalations Dashboard
 * Handles loading and displaying PDFs and PDF regions
 */

/**
 * Load the PDF into the viewer
 * @param {string} filename - Name of the file to load
 */
function loadPDF(filename) {
    try {
        console.log(`Loading PDF for file: ${filename}`);
        
        // Load the full PDF
        const pdfFrame = document.getElementById('pdfFrame');
        pdfFrame.src = `/escalations/api/pdf/${filename}`;
        
        // Load the header region
        loadPDFRegion(filename, 'header', 'headerImage');
        
        // Load the service lines region
        loadPDFRegion(filename, 'service_lines', 'serviceImage');
    } catch (error) {
        console.error('Error loading PDF:', error);
    }
}

/**
 * Load a specific region of a PDF
 * @param {string} filename - Name of the file to load
 * @param {string} region - Region name (header, service_lines, footer)
 * @param {string} imgId - ID of the image element to update
 */
async function loadPDFRegion(filename, region, imgId) {
    try {
        console.log(`Loading PDF region ${region} for file: ${filename}`);
        const response = await fetch(`/escalations/api/pdf_region/${filename}/${region}`);
        
        if (!response.ok) {
            console.error(`Failed to load PDF region: ${response.status} ${response.statusText}`);
            return;
        }
        
        const data = await response.json();
        
        if (data.error) {
            console.error(`Error in PDF region response: ${data.error}`);
            return;
        }
        
        if (data.image) {
            const imgElement = document.getElementById(imgId);
            if (imgElement) {
                imgElement.src = data.image;
                console.log(`Set image for ${region}`);
            } else {
                console.error(`Image element not found: ${imgId}`);
            }
        } else {
            console.error(`No image data returned for ${region}`);
        }
    } catch (error) {
        console.error(`Error loading ${region} PDF region:`, error);
    }
}
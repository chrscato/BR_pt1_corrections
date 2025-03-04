/**
 * Handles loading the full PDF and specific regions (header, service lines).
 */

function loadPDF(filename) {
    const pdfFrame = document.getElementById('pdfFrame');
    pdfFrame.src = `/unmapped/api/pdf/${filename}`;

    loadPDFRegion(filename, 'header', 'headerImage');
    loadPDFRegion(filename, 'service_lines', 'serviceImage');
}

async function loadPDFRegion(filename, region, imgId) {
    try {
        const response = await fetch(`/unmapped/api/pdf_region/${filename}/${region}`);
        const data = await response.json();

        if (data.image) {
            const imgElement = document.getElementById(imgId);
            if (imgElement) {
                imgElement.src = data.image;
            }
        }
    } catch (error) {
        console.error(`Error loading ${region} PDF region:`, error);
    }
}

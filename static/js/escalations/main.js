/**
 * Main JavaScript entry point for the Escalations Dashboard
 * Handles initialization and core functionality
 */

// Global variables
let currentFileName = null;
let currentData = null;
let currentAction = null;

// Initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Set up event listeners for buttons and controls
    setupEventListeners();
    
    // Load the list of escalated files
    loadFiles();
    
    // Debug paths for development
    debugPaths();
});

/**
 * Set up event listeners for the UI elements
 */
function setupEventListeners() {
    // Search button
    const searchButton = document.getElementById('searchButton');
    if (searchButton) {
        searchButton.addEventListener('click', function() {
            performSearch();
        });
    }

    // Resolve button
    const resolveButton = document.getElementById('resolveButton');
    if (resolveButton) {
        resolveButton.addEventListener('click', function() {
            showConfirmation('resolve');
        });
    }
    
    // Reject button
    const rejectButton = document.getElementById('rejectButton');
    if (rejectButton) {
        rejectButton.addEventListener('click', function() {
            showConfirmation('reject');
        });
    }
    
    // Confirm action button in modal
    const confirmActionButton = document.getElementById('confirmActionButton');
    if (confirmActionButton) {
        confirmActionButton.addEventListener('click', function() {
            if (currentAction === 'resolve') {
                resolveEscalation();
            } else if (currentAction === 'reject') {
                rejectEscalation();
            }
        });
    }
}

/**
 * Clear the current file and reset UI
 */
function clearCurrentFile() {
    currentFileName = null;
    currentData = null;
    
    // Reset UI
    document.getElementById('escalationInfo').innerHTML = '<div class="alert alert-info">Select an escalated record to review</div>';
    document.getElementById('recordDetails').innerHTML = '';
    document.getElementById('pdfFrame').src = 'about:blank';
    document.getElementById('headerImage').src = '';
    document.getElementById('serviceImage').src = '';
    document.getElementById('resolutionForm').classList.add('d-none');
    document.getElementById('orderIdInput').value = '';
    document.getElementById('filemakerInput').value = '';
    document.getElementById('resolutionNotes').value = '';
    document.getElementById('rejectionReason').value = '';
    document.getElementById('searchStatus').innerHTML = '';
    document.getElementById('matchResults').innerHTML = '';
    document.getElementById('matchCount').textContent = '0';
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
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    
    // Add the message
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
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

/**
 * Utility function to debug paths
 */
async function debugPaths() {
    try {
        console.log('Fetching debug paths...');
        const response = await fetch('/debug-paths');
        
        if (!response.ok) {
            console.error(`Debug paths failed: ${response.status} ${response.statusText}`);
            return;
        }
        
        const data = await response.json();
        console.log('Debug paths data:', data);
        
        // Log specific information about escalations folder
        if (data.folder_paths && data.folder_paths.ESCALATIONS_FOLDER) {
            console.log('Escalations folder path:', data.folder_paths.ESCALATIONS_FOLDER);
            console.log('Escalations folder exists:', data.folder_paths.ESCALATIONS_FOLDER_exists);
        } else {
            console.error('Escalations folder information not found in debug data');
        }
    } catch (error) {
        console.error('Error fetching debug paths:', error);
    }
}
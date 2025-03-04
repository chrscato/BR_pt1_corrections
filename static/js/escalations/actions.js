/**
 * Action functionality for the Escalations Dashboard
 * Handles resolution and rejection of escalations
 */

/**
 * Show confirmation modal before performing action
 * @param {string} action - Action to confirm ('resolve' or 'reject')
 */
function showConfirmation(action) {
    if (!currentFileName || !currentData) {
        showAlert('No file loaded', 'error');
        return;
    }
    
    currentAction = action;
    
    const modal = new bootstrap.Modal(document.getElementById('confirmationModal'));
    const modalTitle = document.getElementById('confirmationModalLabel');
    const modalBody = document.getElementById('confirmationModalBody');
    const confirmButton = document.getElementById('confirmActionButton');
    
    if (action === 'resolve') {
        const orderId = document.getElementById('orderIdInput').value.trim();
        if (!orderId) {
            showAlert('Order ID is required to resolve an escalation', 'warning');
            return;
        }
        
        modalTitle.textContent = 'Confirm Resolution';
        modalBody.innerHTML = `
            <p>Are you sure you want to resolve this escalation with the following information?</p>
            <ul>
                <li><strong>Order ID:</strong> ${orderId}</li>
                <li><strong>FileMaker Number:</strong> ${document.getElementById('filemakerInput').value.trim() || 'Not provided'}</li>
                <li><strong>Resolution Notes:</strong> ${document.getElementById('resolutionNotes').value.trim() || 'Not provided'}</li>
            </ul>
            <p>The record will be moved to the mapped folder.</p>
        `;
        confirmButton.textContent = 'Resolve';
        confirmButton.className = 'btn btn-success';
    } else if (action === 'reject') {
        const rejectionReason = document.getElementById('rejectionReason').value.trim();
        if (!rejectionReason) {
            showAlert('Rejection reason is required', 'warning');
            return;
        }
        
        modalTitle.textContent = 'Confirm Rejection';
        modalBody.innerHTML = `
            <p>Are you sure you want to reject this escalation?</p>
            <p><strong>Reason:</strong> ${rejectionReason}</p>
            <p>The record will be moved to the rejected folder.</p>
        `;
        confirmButton.textContent = 'Reject';
        confirmButton.className = 'btn btn-danger';
    }
    
    modal.show();
}

/**
 * Resolve the current escalation
 */
async function resolveEscalation() {
    try {
        if (!currentFileName || !currentData) {
            throw new Error('No file loaded');
        }
        
        // Get values from inputs
        const orderId = document.getElementById('orderIdInput').value.trim();
        const filemakerNumber = document.getElementById('filemakerInput').value.trim();
        const resolutionNotes = document.getElementById('resolutionNotes').value.trim();
        
        if (!orderId) {
            throw new Error('Order ID is required');
        }
        
        console.log(`Resolving escalation for ${currentFileName} with Order ID: ${orderId}`);
        
        // Close the modal if it's open
        const modal = bootstrap.Modal.getInstance(document.getElementById('confirmationModal'));
        if (modal) {
            modal.hide();
        }
        
        // Show loading state
        const confirmButton = document.getElementById('confirmActionButton');
        confirmButton.disabled = true;
        confirmButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
        
        // Send the request
        const response = await fetch('/escalations/api/resolve', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                filename: currentFileName,
                content: currentData,
                order_id: orderId,
                filemaker_number: filemakerNumber,
                resolution_notes: resolutionNotes
            }),
        });
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error);
        }
        
        console.log('Escalation resolved successfully');
        
        // Show success message
        showAlert('Escalation resolved successfully', 'success');
        
        // Reload the file list
        loadFiles();
        
        // Clear the current file
        clearCurrentFile();
        
    } catch (error) {
        console.error('Resolution error:', error);
        showAlert(`Error resolving escalation: ${error.message}`, 'error');
        
        // Reset button state
        const confirmButton = document.getElementById('confirmActionButton');
        confirmButton.disabled = false;
        confirmButton.textContent = 'Resolve';
    }
}

/**
 * Reject the current escalation
 */
async function rejectEscalation() {
    try {
        if (!currentFileName || !currentData) {
            throw new Error('No file loaded');
        }
        
        // Get values from inputs
        const rejectionReason = document.getElementById('rejectionReason').value.trim();
        
        if (!rejectionReason) {
            throw new Error('Rejection reason is required');
        }
        
        console.log(`Rejecting escalation for ${currentFileName}`);
        
        // Close the modal if it's open
        const modal = bootstrap.Modal.getInstance(document.getElementById('confirmationModal'));
        if (modal) {
            modal.hide();
        }
        
        // Show loading state
        const confirmButton = document.getElementById('confirmActionButton');
        confirmButton.disabled = true;
        confirmButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
        
        // Send the request
        const response = await fetch('/escalations/api/reject', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                filename: currentFileName,
                content: currentData,
                rejection_reason: rejectionReason
            }),
        });
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error);
        }
        
        console.log('Escalation rejected successfully');
        
        // Show success message
        showAlert('Escalation rejected successfully', 'success');
        
        // Reload the file list
        loadFiles();
        
        // Clear the current file
        clearCurrentFile();
        
    } catch (error) {
        console.error('Rejection error:', error);
        showAlert(`Error rejecting escalation: ${error.message}`, 'error');
        
        // Reset button state
        const confirmButton = document.getElementById('confirmActionButton');
        confirmButton.disabled = false;
        confirmButton.textContent = 'Reject';
    }
}
/**
 * Common JavaScript functions shared across the application
 */

/**
 * Format a charge amount as currency
 * @param {string|number} charge - The charge amount to format
 * @returns {string} Formatted currency string
 */
function formatCurrency(charge) {
    // Handle empty values
    if (!charge) return "$0.00";
    
    // Convert string to number, removing any currency symbols
    let numericCharge;
    if (typeof charge === 'string') {
        numericCharge = parseFloat(charge.replace(/[$,]/g, ''));
    } else {
        numericCharge = parseFloat(charge);
    }
    
    // Check if value is a valid number
    if (isNaN(numericCharge)) return "$0.00";
    
    // Format with dollar sign and 2 decimal places
    return `$${numericCharge.toFixed(2)}`;
}

/**
 * Parse a date string to a formatted date
 * @param {string} dateStr - Date string in various formats
 * @param {string} outputFormat - Output format ('YYYY-MM-DD', 'MM/DD/YYYY', etc.)
 * @returns {string} Formatted date or original string if parsing fails
 */
function formatDate(dateStr, outputFormat = 'YYYY-MM-DD') {
    if (!dateStr) return '';
    
    // Attempt to parse various date formats
    const dateFormats = [
        // ISO format
        { regex: /^(\d{4})-(\d{2})-(\d{2})$/, parts: [1, 2, 3] },
        // US format with slashes
        { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, parts: [3, 1, 2] },
        // US format with dashes
        { regex: /^(\d{1,2})-(\d{1,2})-(\d{4})$/, parts: [3, 1, 2] },
        // YYYYMMDD format
        { regex: /^(\d{4})(\d{2})(\d{2})$/, parts: [1, 2, 3] }
    ];
    
    let year, month, day;
    
    // Try each format
    for (const format of dateFormats) {
        const match = dateStr.match(format.regex);
        if (match) {
            year = match[format.parts[0]];
            month = match[format.parts[1]].padStart(2, '0');
            day = match[format.parts[2]].padStart(2, '0');
            break;
        }
    }
    
    // Return formatted date or original string if parsing failed
    if (!year || !month || !day) return dateStr;
    
    switch (outputFormat) {
        case 'YYYY-MM-DD':
            return `${year}-${month}-${day}`;
        case 'MM/DD/YYYY':
            return `${month}/${day}/${year}`;
        case 'MM-DD-YYYY':
            return `${month}-${day}-${year}`;
        default:
            return `${year}-${month}-${day}`;
    }
}

/**
 * Debounce helper function to limit how often a function can be called
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}

/**
 * Create an element with classes and attributes
 * @param {string} tag - HTML tag name
 * @param {Object} options - Options for the element
 * @param {string|string[]} [options.classes] - CSS classes to add
 * @param {Object} [options.attributes] - Attributes to set
 * @param {string|Node} [options.content] - Content to append
 * @returns {HTMLElement} The created element
 */
function createElement(tag, options = {}) {
    const element = document.createElement(tag);
    
    // Add classes
    if (options.classes) {
        const classList = Array.isArray(options.classes) ? options.classes : [options.classes];
        element.classList.add(...classList);
    }
    
    // Set attributes
    if (options.attributes) {
        for (const [key, value] of Object.entries(options.attributes)) {
            element.setAttribute(key, value);
        }
    }
    
    // Add content
    if (options.content) {
        if (typeof options.content === 'string') {
            element.innerHTML = options.content;
        } else {
            element.appendChild(options.content);
        }
    }
    
    return element;
}

/**
 * Show an alert message that automatically disappears
 * @param {string} message - The message to display
 * @param {string} type - Alert type ('success', 'error', 'info', 'warning')
 * @param {number} duration - Duration in milliseconds
 */
function showAlert(message, type = 'success', duration = 3000) {
    // Remove any existing alerts
    const existingAlert = document.querySelector('.alert-floating');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    // Map type to Bootstrap class
    const typeClass = {
        success: 'alert-success',
        error: 'alert-danger',
        info: 'alert-info',
        warning: 'alert-warning'
    }[type] || 'alert-info';
    
    // Create alert element
    const alert = createElement('div', {
        classes: ['alert', 'alert-floating', typeClass],
        content: message
    });
    
    // Add to document
    document.body.appendChild(alert);
    
    // Remove after duration
    setTimeout(() => {
        alert.classList.add('fade-out');
        setTimeout(() => alert.remove(), 500);
    }, duration);
}
/**
 * Search functionality for the Escalations Dashboard
 * Handles database searching and result display
 */

/**
 * Pre-populate the search form with data from the file
 * @param {string} filename - Name of the file to load
 */
async function prepopulateSearch(filename) {
    try {
        console.log(`Pre-populating search for file: ${filename}`);
        const response = await fetch(`/escalations/api/extract_patient_info/${filename}`);
        
        if (!response.ok) {
            console.error(`Failed to extract patient info: ${response.status} ${response.statusText}`);
            return;
        }
        
        const data = await response.json();
        
        if (data.error) {
            console.error(`Error in extract patient info response: ${data.error}`);
            return;
        }
        
        document.getElementById('firstNameSearch').value = data.first_name || '';
        document.getElementById('lastNameSearch').value = data.last_name || '';
        document.getElementById('dosSearch').value = data.dos || '';
        
        console.log(`Populated search form with: ${data.first_name} ${data.last_name}, DOS: ${data.dos}`);
        
        // Auto-search if we have data
        if ((data.first_name || data.last_name) && data.dos) {
            console.log('Auto-starting search with extracted data');
            performSearch();
        }
    } catch (error) {
        console.error('Error pre-populating search:', error);
    }
}

/**
 * Perform a database search using the form data
 */
async function performSearch() {
    try {
        const firstName = document.getElementById('firstNameSearch').value;
        const lastName = document.getElementById('lastNameSearch').value;
        const dosDate = document.getElementById('dosSearch').value;
        const monthsRange = document.getElementById('monthsRange').value;
        
        console.log(`Performing search: ${firstName} ${lastName}, DOS: ${dosDate}, Range: ${monthsRange}`);
        
        if (!firstName && !lastName) {
            document.getElementById('searchStatus').innerHTML = 
                '<div class="alert alert-warning">Please enter at least a first or last name</div>';
            return;
        }
        
        // Show loading indicator
        document.getElementById('searchStatus').innerHTML = 
            '<div class="alert alert-info">Searching...</div>';
        
        const response = await fetch('/escalations/api/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                first_name: firstName,
                last_name: lastName,
                dos_date: dosDate,
                months_range: monthsRange
            }),
        });
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error);
        }
        
        console.log(`Search returned ${result.results ? result.results.length : 0} results`);
        displaySearchResults(result.results);
    } catch (error) {
        console.error('Search error:', error);
        document.getElementById('searchStatus').innerHTML = 
            `<div class="alert alert-danger">Search error: ${error.message}</div>`;
    }
}

/**
 * Display search results in the UI
 * @param {Array} results - Search results to display
 */
function displaySearchResults(results) {
    const matchResults = document.getElementById('matchResults');
    const matchCount = document.getElementById('matchCount');
    const searchStatus = document.getElementById('searchStatus');
    
    if (!results || results.length === 0) {
        matchResults.innerHTML = '';
        matchCount.textContent = '0';
        searchStatus.innerHTML = '<div class="alert alert-warning">No matches found</div>';
        return;
    }
    
    // Update match count
    matchCount.textContent = results.length.toString();
    searchStatus.innerHTML = '';
    
    // Display results
    let html = '';
    results.forEach(result => {
        const matchScore = result.match_score ? Math.round(result.match_score) : 'N/A';
        const daysFromTarget = result.days_from_target !== undefined ? result.days_from_target : 'N/A';
        
        html += `
            <div class="card mb-2">
                <div class="card-header p-2">
                    <div class="d-flex justify-content-between align-items-center">
                        <strong>${result.Patient_Last_Name}, ${result.Patient_First_Name}</strong>
                        <button class="btn btn-sm btn-success" 
                                onclick="applyMatch('${result.Order_ID}', '${result.FileMaker_Record_Number}')">
                            Apply
                        </button>
                    </div>
                </div>
                <div class="card-body p-2">
                    <p class="mb-1"><small>Order ID: ${result.Order_ID}</small></p>
                    <p class="mb-1"><small>FileMaker: ${result.FileMaker_Record_Number}</small></p>
                    <p class="mb-1"><small>DOS: ${result.DOS_List || 'N/A'}</small></p>
                    <p class="mb-1"><small>CPT: ${result.CPT_List || 'N/A'}</small></p>
                    <div class="d-flex justify-content-between">
                        <span class="badge bg-primary">Match: ${matchScore}%</span>
                        <span class="badge bg-info">Days: ${daysFromTarget}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    matchResults.innerHTML = html;
}

/**
 * Apply a match from the search results
 * @param {string} orderId - Order ID to apply
 * @param {string} fileMakerRecord - FileMaker record number to apply
 */
function applyMatch(orderId, fileMakerRecord) {
    console.log(`Applying match: Order ID ${orderId}, FileMaker ${fileMakerRecord}`);
    document.getElementById('orderIdInput').value = orderId;
    document.getElementById('filemakerInput').value = fileMakerRecord;
    
    // Highlight the inputs to show they've been updated
    document.getElementById('orderIdInput').classList.add('border-success');
    document.getElementById('filemakerInput').classList.add('border-success');
    
    // Scroll to the resolution form
    document.getElementById('resolutionForm').scrollIntoView({ behavior: 'smooth' });
}
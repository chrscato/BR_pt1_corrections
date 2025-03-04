/**
 * Handles patient search functionality.
 */

// Make sure to expose functions to the global scope
window.prepopulateSearch = async function(filename) {
    try {
        console.log(`Prepopulating search with data from ${filename}`);
        const response = await fetch(`/unmapped/api/extract_patient_info/${filename}`);
        const data = await response.json();

        if (response.ok) {
            console.log("Patient info extracted:", data);
            document.getElementById('firstNameSearch').value = data.first_name || '';
            document.getElementById('lastNameSearch').value = data.last_name || '';
            document.getElementById('dosSearch').value = data.dos || '';

            if ((data.first_name || data.last_name) && data.dos) {
                console.log("Auto-running search with extracted patient info");
                performSearch();
            }
        } else {
            console.error("Error extracting patient info:", data.error);
        }
    } catch (error) {
        console.error('Error pre-populating search:', error);
    }
};

window.performSearch = async function() {
    try {
        const firstName = document.getElementById('firstNameSearch').value;
        const lastName = document.getElementById('lastNameSearch').value;
        const dosDate = document.getElementById('dosSearch').value;
        const monthsRange = document.getElementById('monthsRange')?.value || '3';

        if (!firstName && !lastName) {
            document.getElementById('searchStatus').innerHTML = '<div class="alert alert-warning">Enter at least a first or last name</div>';
            return;
        }

        console.log(`Performing search with: ${firstName} ${lastName}, DOS: ${dosDate}, Range: ${monthsRange}`);
        document.getElementById('searchStatus').innerHTML = '<div class="alert alert-info">Searching...</div>';

        const response = await fetch('/unmapped/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                first_name: firstName, 
                last_name: lastName, 
                dos_date: dosDate,
                months_range: monthsRange 
            }),
        });

        const result = await response.json();
        console.log(`Search returned ${result.results ? result.results.length : 0} results`);
        
        if (!response.ok) throw new Error(result.error || 'Search failed');

        displaySearchResults(result.results);
    } catch (error) {
        console.error('Search error:', error);
        document.getElementById('searchStatus').innerHTML = `<div class="alert alert-danger">Search error: ${error.message}</div>`;
    }
};

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

    matchCount.textContent = results.length.toString();
    searchStatus.innerHTML = '';

    let html = '';
    results.forEach(result => {
        const matchScore = result.match_score ? Math.round(result.match_score) : 'N/A';
        const daysFromTarget = result.days_from_target !== undefined ? result.days_from_target : 'N/A';

        html += `
            <div class="card mb-2">
                <div class="card-header p-2">
                    <div class="d-flex justify-content-between align-items-center">
                        <strong>${result.Patient_Last_Name || ''}, ${result.Patient_First_Name || ''}</strong>
                        <button class="btn btn-sm btn-success" 
                                onclick="applyMatch('${result.Order_ID}', '${result.FileMaker_Record_Number}')">
                            Apply
                        </button>
                    </div>
                </div>
                <div class="card-body p-2">
                    <p class="mb-1"><small>Order ID: ${result.Order_ID || 'N/A'}</small></p>
                    <p class="mb-1"><small>FileMaker: ${result.FileMaker_Record_Number || 'N/A'}</small></p>
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

window.applyMatch = function(orderId, fileMakerRecord) {
    console.log(`Applying match: Order ID ${orderId}, FileMaker ${fileMakerRecord}`);
    document.getElementById('orderIdInput').value = orderId;
    document.getElementById('filemakerInput').value = fileMakerRecord;
    
    // Highlight the inputs to show they've been updated
    document.getElementById('orderIdInput').classList.add('border-success');
    document.getElementById('filemakerInput').classList.add('border-success');
    
    // Show a success message
    showAlert('Match applied successfully!', 'success');
};

// Export displaySearchResults to global scope
window.displaySearchResults = displaySearchResults;
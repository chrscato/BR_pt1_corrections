/**
 * Handles patient search functionality.
 */

async function prepopulateSearch(filename) {
    try {
        const response = await fetch(`/unmapped/api/extract_patient_info/${filename}`);
        const data = await response.json();

        if (response.ok) {
            document.getElementById('firstNameSearch').value = data.first_name || '';
            document.getElementById('lastNameSearch').value = data.last_name || '';
            document.getElementById('dosSearch').value = data.dos || '';

            if ((data.first_name || data.last_name) && data.dos) {
                performSearch();
            }
        }
    } catch (error) {
        console.error('Error pre-populating search:', error);
    }
}

async function performSearch() {
    try {
        const firstName = document.getElementById('firstNameSearch').value;
        const lastName = document.getElementById('lastNameSearch').value;
        const dosDate = document.getElementById('dosSearch').value;

        if (!firstName && !lastName) {
            document.getElementById('searchStatus').innerHTML = '<div class="alert alert-warning">Enter at least a first or last name</div>';
            return;
        }

        document.getElementById('searchStatus').innerHTML = '<div class="alert alert-info">Searching...</div>';

        const response = await fetch('/unmapped/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ first_name: firstName, last_name: lastName, dos_date: dosDate }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Search failed');

        displaySearchResults(result.results);
    } catch (error) {
        console.error('Search error:', error);
        document.getElementById('searchStatus').innerHTML = `<div class="alert alert-danger">Search error: ${error.message}</div>`;
    }
}

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

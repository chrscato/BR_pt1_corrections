/**
 * Simple Categorization Status Panel
 * Adds a status panel without modifying any existing functionality
 */

// Wait for the page to be fully loaded and initialized
document.addEventListener('DOMContentLoaded', function() {
  // Wait for the rate corrections app to initialize (slightly longer delay)
  setTimeout(initCategorizationPanel, 2000);
});

/**
 * Initialize the categorization panel
 */
function initCategorizationPanel() {
  console.log('Initializing categorization panel');
  
  // Fetch the data and create the panel
  fetchDataAndCreatePanel();
}

/**
 * Fetch data and create the panel
 */
async function fetchDataAndCreatePanel() {
  try {
    // Fetch the provider data
    const response = await fetch('/rate_corrections/api/tins');
    if (!response.ok) {
      throw new Error(`Failed to fetch provider data: ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.tins || !Array.isArray(data.tins)) {
      console.warn('No provider data available');
      return;
    }
    
    console.log(`Found ${data.tins.length} providers to analyze`);
    
    // Calculate categorization statistics
    const stats = calculateCategorizationStats(data.tins);
    
    // Create and display the panel
    createCategorizationPanel(stats);
    
    // Add visual indicators to the provider list items
    setTimeout(() => addVisualIndicators(stats), 1000);
    
  } catch (error) {
    console.error('Error creating categorization panel:', error);
  }
}

/**
 * Calculate categorization statistics for providers
 */
function calculateCategorizationStats(providers) {
  // Get code summary data if available
  const codeSummary = window.codeSummaryData?.code_summary || {};
  
  const stats = {
    total: providers.length,
    fullyCategorized: 0,
    partiallyCategorized: 0,
    uncategorized: 0,
    providersByStatus: {}
  };
  
  // Track providers by TIN for each status
  stats.providersByStatus.fullyCategorized = [];
  stats.providersByStatus.partiallyCategorized = [];
  stats.providersByStatus.uncategorized = [];
  
  // Analyze each provider
  providers.forEach(provider => {
    const tin = provider.tin;
    const cptCodes = provider.cpt_codes || [];
    
    if (cptCodes.length === 0) {
      return; // Skip providers with no CPT codes
    }
    
    let categorizedCount = 0;
    let uncategorizedCount = 0;
    
    // Check each CPT code
    cptCodes.forEach(code => {
      let isCategorized = false;
      
      // Check if this code is in any category
      Object.keys(codeSummary).forEach(category => {
        if (category.toLowerCase() !== 'uncategorized' && 
            codeSummary[category].distinct_codes && 
            codeSummary[category].distinct_codes.includes(code)) {
          isCategorized = true;
        }
      });
      
      if (isCategorized) {
        categorizedCount++;
      } else {
        uncategorizedCount++;
      }
    });
    
    // Determine provider status
    if (uncategorizedCount === 0 && categorizedCount > 0) {
      stats.fullyCategorized++;
      stats.providersByStatus.fullyCategorized.push(tin);
    } else if (categorizedCount === 0) {
      stats.uncategorized++;
      stats.providersByStatus.uncategorized.push(tin);
    } else {
      stats.partiallyCategorized++;
      stats.providersByStatus.partiallyCategorized.push(tin);
    }
  });
  
  return stats;
}

/**
 * Create and display the categorization panel
 */
function createCategorizationPanel(stats) {
  // Find the left column
  const leftColumn = document.querySelector('.col-md-4');
  if (!leftColumn) {
    console.warn('Left column not found');
    return;
  }
  
  // Create the panel
  const panel = document.createElement('div');
  panel.id = 'categorizationStatusPanel';
  panel.className = 'card mb-3';
  
  // Calculate percentages
  const fullPct = stats.total > 0 ? Math.round((stats.fullyCategorized / stats.total) * 100) : 0;
  const partialPct = stats.total > 0 ? Math.round((stats.partiallyCategorized / stats.total) * 100) : 0;
  const uncatPct = stats.total > 0 ? Math.round((stats.uncategorized / stats.total) * 100) : 0;
  
  // Set the panel content
  panel.innerHTML = `
    <div class="card-header">
      <strong>Categorization Summary</strong>
    </div>
    <div class="card-body p-3">
      <p class="text-muted small mb-2">Providers with categorized CPT codes are easier to fix with category-based rates</p>
      
      <div class="mb-3">
        <div class="d-flex justify-content-between">
          <span><span class="badge bg-success">&nbsp;</span> Fully Categorized</span>
          <strong>${stats.fullyCategorized}</strong>
        </div>
        <div class="progress my-1" style="height: 6px;">
          <div class="progress-bar bg-success" role="progressbar" style="width: ${fullPct}%"></div>
        </div>
      </div>
      
      <div class="mb-3">
        <div class="d-flex justify-content-between">
          <span><span class="badge bg-warning">&nbsp;</span> Partially Categorized</span>
          <strong>${stats.partiallyCategorized}</strong>
        </div>
        <div class="progress my-1" style="height: 6px;">
          <div class="progress-bar bg-warning" role="progressbar" style="width: ${partialPct}%"></div>
        </div>
      </div>
      
      <div class="mb-0">
        <div class="d-flex justify-content-between">
          <span><span class="badge bg-danger">&nbsp;</span> Not Categorized</span>
          <strong>${stats.uncategorized}</strong>
        </div>
        <div class="progress my-1" style="height: 6px;">
          <div class="progress-bar bg-danger" role="progressbar" style="width: ${uncatPct}%"></div>
        </div>
      </div>
    </div>
  `;
  
  // Insert the panel in the correct position
  const categoryCard = leftColumn.querySelector('.card:nth-child(2)');
  if (categoryCard) {
    leftColumn.insertBefore(panel, categoryCard);
  } else {
    leftColumn.appendChild(panel);
  }
  
  console.log('Categorization panel created');
}

/**
 * Add visual indicators to provider list items
 */
function addVisualIndicators(stats) {
  const tinList = document.getElementById('tinList');
  if (!tinList) {
    console.warn('Provider list element not found');
    return;
  }
  
  // Get all the provider list items
  const listItems = tinList.querySelectorAll('.list-group-item');
  if (listItems.length === 0) {
    console.warn('No provider list items found');
    return;
  }
  
  console.log(`Adding visual indicators to ${listItems.length} providers`);
  
  // Go through each list item
  listItems.forEach(item => {
    // Find the provider TIN
    const viewBtn = item.querySelector('.view-provider-btn');
    if (!viewBtn) return;
    
    const tin = viewBtn.getAttribute('data-tin');
    if (!tin) return;
    
    // Determine the provider's status
    if (stats.providersByStatus.fullyCategorized.includes(tin)) {
      // Fully categorized
      item.style.borderLeft = '4px solid #28a745';
      
      // Add a small indicator badge
      const badgeContainer = item.querySelector('.d-flex.w-100.justify-content-between');
      if (badgeContainer) {
        const badge = document.createElement('span');
        badge.className = 'badge bg-success ms-2';
        badge.textContent = 'Categorized';
        badge.style.fontSize = '0.7rem';
        
        // Insert the badge
        const firstHeader = badgeContainer.querySelector('h6');
        if (firstHeader) {
          firstHeader.appendChild(badge);
        }
      }
    } 
    else if (stats.providersByStatus.partiallyCategorized.includes(tin)) {
      // Partially categorized
      item.style.borderLeft = '4px solid #ffc107';
    }
    else if (stats.providersByStatus.uncategorized.includes(tin)) {
      // Not categorized
      item.style.borderLeft = '4px solid #dc3545';
    }
  });
  
  console.log('Visual indicators added');
}
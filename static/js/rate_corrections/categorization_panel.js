/**
 * Standalone Categorization Panel
 * Completely independent from other code - won't interfere with anything
 */

// Wait a good amount of time for everything else to load first
window.addEventListener('load', function() {
    // Wait 3 seconds to make sure everything else has initialized
    setTimeout(initStandalonePanel, 3000);
  });
  
  /**
   * Initialize the standalone panel
   */
  async function initStandalonePanel() {
    try {
      console.log('Initializing standalone categorization panel');
      
      // See if we can fetch the provider data
      const response = await fetch('/rate_corrections/api/tins');
      const data = await response.json();
      
      // Make sure we have provider data
      if (!data || !data.tins || !Array.isArray(data.tins) || data.tins.length === 0) {
        console.log('No provider data available yet');
        return;
      }
      
      // Get code summary data if available (for categorization)
      let codeSummary = {};
      try {
        const summaryResponse = await fetch('/rate_corrections/api/missing_codes_summary');
        const summaryData = await summaryResponse.json();
        codeSummary = summaryData.code_summary || {};
      } catch (err) {
        console.log('Could not load code summary data', err);
      }
      
      // Calculate categorization stats
      const stats = analyzeProviders(data.tins, codeSummary);
      
      // Create the panel
      createStandalonePanel(stats);
      
    } catch (error) {
      console.error('Error in standalone panel:', error);
    }
  }
  
  /**
   * Analyze providers to determine categorization status
   */
  function analyzeProviders(providers, codeSummary) {
    const stats = {
      total: providers.length,
      fullyCategorized: 0,
      partiallyCategorized: 0,
      uncategorized: 0
    };
    
    // Analyze each provider
    providers.forEach(provider => {
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
      } else if (categorizedCount === 0) {
        stats.uncategorized++;
      } else {
        stats.partiallyCategorized++;
      }
    });
    
    return stats;
  }
  
  /**
   * Create and display a standalone categorization panel
   */
  function createStandalonePanel(stats) {
    // Find the left column - try different selectors to be safe
    let leftColumn = document.querySelector('.col-md-4');
    if (!leftColumn) {
      leftColumn = document.querySelector('.col-4');
    }
    if (!leftColumn) {
      // Try to find any column that might contain provider list
      leftColumn = document.querySelector('[id*="category"], [id*="provider"], [id*="tin"]');
      if (!leftColumn) {
        leftColumn = document.body; // Last resort - add to body
      }
    }
    
    // Create the panel
    const panel = document.createElement('div');
    panel.id = 'categorizationStandalonePanel';
    panel.style.margin = '1rem 0';
    panel.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
    panel.style.borderRadius = '4px';
    panel.style.overflow = 'hidden';
    panel.style.border = '1px solid #dee2e6';
    
    // Calculate percentages (safely)
    const fullPct = stats.total > 0 ? Math.round((stats.fullyCategorized / stats.total) * 100) : 0;
    const partialPct = stats.total > 0 ? Math.round((stats.partiallyCategorized / stats.total) * 100) : 0;
    const uncatPct = stats.total > 0 ? Math.round((stats.uncategorized / stats.total) * 100) : 0;
    
    // Set the panel content - using inline styles to avoid CSS dependencies
    panel.innerHTML = `
      <div style="padding: 0.75rem 1rem; background-color: #f8f9fa; border-bottom: 1px solid #dee2e6;">
        <strong>Provider Categorization Helper</strong>
      </div>
      <div style="padding: 1rem;">
        <p style="color: #6c757d; font-size: 0.875rem; margin-bottom: 0.75rem;">
          This shows which providers have categorized CPT codes (easier to fix with category-based rates)
        </p>
        
        <div style="margin-bottom: 1rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
            <span>
              <span style="display: inline-block; width: 1rem; height: 1rem; background-color: #28a745; border-radius: 2px;"></span>
              Fully Categorized
            </span>
            <strong>${stats.fullyCategorized}</strong>
          </div>
          <div style="height: 6px; background-color: #e9ecef; border-radius: 3px; margin-bottom: 0.5rem;">
            <div style="height: 100%; width: ${fullPct}%; background-color: #28a745; border-radius: 3px;"></div>
          </div>
        </div>
        
        <div style="margin-bottom: 1rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
            <span>
              <span style="display: inline-block; width: 1rem; height: 1rem; background-color: #ffc107; border-radius: 2px;"></span>
              Partially Categorized
            </span>
            <strong>${stats.partiallyCategorized}</strong>
          </div>
          <div style="height: 6px; background-color: #e9ecef; border-radius: 3px; margin-bottom: 0.5rem;">
            <div style="height: 100%; width: ${partialPct}%; background-color: #ffc107; border-radius: 3px;"></div>
          </div>
        </div>
        
        <div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
            <span>
              <span style="display: inline-block; width: 1rem; height: 1rem; background-color: #dc3545; border-radius: 2px;"></span>
              Not Categorized
            </span>
            <strong>${stats.uncategorized}</strong>
          </div>
          <div style="height: 6px; background-color: #e9ecef; border-radius: 3px; margin-bottom: 0.5rem;">
            <div style="height: 100%; width: ${uncatPct}%; background-color: #dc3545; border-radius: 3px;"></div>
          </div>
        </div>
      </div>
    `;
    
    // Find where to insert the panel
    // First try to find after the first card
    const firstCard = leftColumn.querySelector('.card');
    if (firstCard) {
      // Insert after the first card
      if (firstCard.nextSibling) {
        leftColumn.insertBefore(panel, firstCard.nextSibling);
      } else {
        leftColumn.appendChild(panel);
      }
    } else {
      // If no card found, just append to the column
      leftColumn.appendChild(panel);
    }
    
    console.log('Standalone categorization panel created');
  }
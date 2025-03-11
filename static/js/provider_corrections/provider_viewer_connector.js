/**
 * Provider Viewer Connector
 * Connects provider list with PDF viewer functionality
 */

// Modify the setupProviderListEventListeners function to use our PDF viewer
function setupProviderListEventListeners() {
    console.log("Setting up provider list event listeners with PDF support...");
  
    // Add a mutation observer to handle dynamically loaded provider items
    const providerList = document.getElementById('providerList');
    if (!providerList) {
      console.warn("Provider list element not found");
      return;
    }
  
    // Create and configure the observer
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // For each added node, check if it's a provider item and add our event listener
          mutation.addedNodes.forEach(function(node) {
            if (node.classList && node.classList.contains('provider-item')) {
              attachProviderClickHandler(node);
            }
          });
        }
      });
    });
  
    // Start observing the target node for configured mutations
    observer.observe(providerList, { childList: true, subtree: true });
  
    // Also attach handlers to any existing provider items
    const providerItems = document.querySelectorAll('.provider-item');
    providerItems.forEach(attachProviderClickHandler);
  }
  
  /**
   * Attach click handler to a provider item with PDF support
   * @param {HTMLElement} item - The provider item element
   */
  function attachProviderClickHandler(item) {
    item.addEventListener('click', function() {
      // Remove active class from all items
      document.querySelectorAll('.provider-item').forEach(el => el.classList.remove('active'));
      
      // Add active class to this item
      this.classList.add('active');
  
      try {
        // Get the provider data
        const providerData = JSON.parse(this.getAttribute('data-provider'));
        
        // Load provider details
        loadProviderDetails(providerData);
        
        // Load the PDF if file_name is available
        if (providerData.file_name) {
          // Use our enhanced PDF viewer
          if (typeof setCurrentFile === 'function') {
            setCurrentFile(providerData.file_name);
          } else {
            console.warn("PDF viewer function 'setCurrentFile' not found");
          }
        }
      } catch (error) {
        console.error("Error handling provider click:", error);
      }
    });
  }
  
  // Make sure the original loadProviderDetails function is preserved
  // but we'll create a backup in case it exists in your provider_list.js file
  window.originalLoadProviderDetails = window.loadProviderDetails || function() {};
  
  // Extend the loadProviderDetails function to ensure PDF loading
  window.loadProviderDetails = function(provider) {
    // Call the original function if it exists
    if (window.originalLoadProviderDetails !== window.loadProviderDetails) {
      window.originalLoadProviderDetails(provider);
    }
    
    // Add PDF loading regardless
    if (provider && provider.file_name && typeof setCurrentFile === 'function') {
      setCurrentFile(provider.file_name);
    }
  };
  
  // Initialize on page load
  document.addEventListener('DOMContentLoaded', function() {
    setupProviderListEventListeners();
    
    console.log("Provider viewer connector initialized");
  });
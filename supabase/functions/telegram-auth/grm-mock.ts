
// Mock implementation of GRM functionality for environments where the library is not available
// This ensures that our code can still function even if GRM cannot be loaded

export const GramJsMock = {
  initRuntime: () => {
    console.log("GRM mock: initRuntime called");
  },
  
  initSession: (session) => {
    console.log("GRM mock: initSession called");
  },
  
  enhanceClient: (client) => {
    console.log("GRM mock: enhanceClient called");
    // Add any missing methods to the client that might be expected
    if (!client.gramEnhanced) {
      client.gramEnhanced = true;
    }
  },
  
  validateCredentials: async (apiId, apiHash) => {
    console.log("GRM mock: validateCredentials called");
    // Simple format validation
    return typeof apiId === 'string' && 
           /^\d+$/.test(apiId) && 
           typeof apiHash === 'string' && 
           apiHash.length > 10;
  },
  
  generateQrLogin: async (client) => {
    console.log("GRM mock: generateQrLogin called");
    // Return null to force fallback to the regular qrLogin method
    return null;
  },
  
  checkAuthorization: async (client) => {
    console.log("GRM mock: checkAuthorization called");
    // Fall back to the standard method
    return await client.isUserAuthorized();
  },
  
  Utils: {
    encodeSession: (data) => {
      console.log("GRM mock: encodeSession called");
      if (typeof data === 'string') {
        return data;
      }
      try {
        return JSON.stringify(data);
      } catch (e) {
        return String(data || '');
      }
    },
    
    decodeSession: (encoded) => {
      console.log("GRM mock: decodeSession called");
      try {
        return JSON.parse(encoded);
      } catch (e) {
        return encoded;
      }
    }
  }
};

// Function to get either the real GRM or the mock
export async function getGramJs() {
  try {
    // Try to import the real GRM library
    const { GramJs } = await import("https://esm.sh/@grm/core@1.6.7");
    console.log("Using real GRM library");
    return GramJs;
  } catch (e) {
    // If import fails, return the mock
    console.log("GRM library not available, using mock implementation");
    return GramJsMock;
  }
}

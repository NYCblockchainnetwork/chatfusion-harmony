
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthGuard, UnauthGuard } from "@/components/AuthGuard";
import { useState, useEffect } from "react";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";

// Create a query client with defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Global error handler
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("Global error caught:", event.error);
      setError(event.error);
    };

    window.addEventListener("error", handleError);
    
    // Initialize the app and check for compatibility
    const checkCompatibility = async () => {
      try {
        // Check if we're in a browser environment where Buffer isn't available
        if (typeof window !== 'undefined' && typeof Buffer === 'undefined') {
          console.warn("Running in browser environment without Buffer support. Using mock implementation.");
        }
        setIsLoading(false);
      } catch (err) {
        console.error("Initialization error:", err);
        setError(err instanceof Error ? err : new Error("Unknown initialization error"));
        setIsLoading(false);
      }
    };
    
    checkCompatibility();
    
    return () => window.removeEventListener("error", handleError);
  }, []);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading application...</p>
        </div>
      </div>
    );
  }

  // If there's a critical error, display it instead of the app
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg">
          <h1 className="text-xl font-bold text-red-600 mb-4">Application Error</h1>
          <p className="mb-4 text-gray-700">
            Sorry, the application encountered an error. This is likely because the Telegram
            library is not fully compatible with browser environments.
          </p>
          <div className="bg-gray-100 p-4 rounded mb-4 overflow-auto max-h-40">
            <code className="text-sm text-gray-800">{error.message}</code>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route 
                path="/login" 
                element={
                  <UnauthGuard>
                    <Login />
                  </UnauthGuard>
                } 
              />
              <Route 
                path="/" 
                element={
                  <AuthGuard>
                    <Index />
                  </AuthGuard>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <AuthGuard>
                    <Settings />
                  </AuthGuard>
                } 
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

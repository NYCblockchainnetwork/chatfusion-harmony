
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
import TelegramProvider from "./contexts/TelegramContext";

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
  const [isLoading, setIsLoading] = useState(true);

  // Global error handler and initialization
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("Global error caught:", event.error);
    };

    window.addEventListener("error", handleError);
    
    // Initialize app
    const initializeApp = async () => {
      try {
        // Simple initialization check
        console.log("App initializing...");
        setIsLoading(false);
      } catch (err) {
        console.error("Initialization error:", err);
        setIsLoading(false);
      }
    };
    
    initializeApp();
    
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

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <TelegramProvider>
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
          </TelegramProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

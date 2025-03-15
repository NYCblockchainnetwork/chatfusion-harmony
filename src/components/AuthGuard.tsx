
import React, { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Progress } from '@/components/ui/progress';

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // After authentication is confirmed, ensure we're on the right page
    if (!isLoading && isAuthenticated) {
      console.log("User is authenticated, rendering protected content");
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading) {
    // Show a loading state while checking authentication
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="w-64 mb-4">
          <Progress value={65} className="h-2" />
        </div>
        <p className="text-gray-500">Loading application...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login if not authenticated
    console.log("User is not authenticated, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  // Render children if authenticated
  return <>{children}</>;
};

export const UnauthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If we finish loading and user is authenticated, redirect to home
    if (!isLoading && isAuthenticated) {
      console.log("User is already authenticated, redirecting to home page");
      navigate("/", { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="w-64 mb-4">
          <Progress value={40} className="h-2" />
        </div>
        <p className="text-gray-500">Checking authentication status...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    // This should be handled by the useEffect above, but as a fallback:
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

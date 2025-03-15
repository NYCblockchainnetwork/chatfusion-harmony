
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';

type User = {
  id: string;
  name: string;
  email: string;
  photoUrl: string;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
};

// This is a publishable client ID that is safe to include in client-side code
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useLocalStorage<User | null>('auth_user', null);
  const [isLoading, setIsLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);

  // Load the Google API script
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.error('Google Client ID is not set. Set the VITE_GOOGLE_CLIENT_ID environment variable.');
      setIsLoading(false);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setAuthInitialized(true);
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Initialize Google authentication once the script is loaded
  useEffect(() => {
    if (!authInitialized || !GOOGLE_CLIENT_ID) {
      return;
    }

    window.google?.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredentialResponse,
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    setIsLoading(false);
  }, [authInitialized]);

  const handleGoogleCredentialResponse = (response: any) => {
    if (!response?.credential) {
      console.error('Google authentication failed: No credential');
      return;
    }

    // Decode the JWT token to get user information
    const decodedToken = decodeJwtResponse(response.credential);
    const googleUser: User = {
      id: decodedToken.sub,
      name: decodedToken.name,
      email: decodedToken.email,
      photoUrl: decodedToken.picture,
    };

    setUser(googleUser);
  };

  // Function to decode the JWT token received from Google
  const decodeJwtResponse = (token: string) => {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
    return JSON.parse(jsonPayload);
  };

  const loginWithGoogle = async () => {
    try {
      setIsLoading(true);
      
      if (!window.google || !GOOGLE_CLIENT_ID) {
        throw new Error('Google authentication is not initialized');
      }

      // Prompt the Google login popup
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          console.error('Google login prompt failed:', notification);
          setIsLoading(false);
          throw new Error('Google login failed. Please try again.');
        }
      });
      
      return Promise.resolve();
    } catch (error) {
      setIsLoading(false);
      console.error('Google login failed:', error);
      return Promise.reject(error);
    }
  };

  const logout = () => {
    setUser(null);
    if (window.google) {
      window.google.accounts.id.disableAutoSelect();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

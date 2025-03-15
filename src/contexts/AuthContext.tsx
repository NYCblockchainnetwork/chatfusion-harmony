
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useLocalStorage<User | null>('auth_user', null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate checking if user is already logged in
    setIsLoading(false);
  }, []);

  const loginWithGoogle = async () => {
    try {
      setIsLoading(true);
      
      // Simulate Google login process
      // In a real app, this would use a proper OAuth flow
      const mockGoogleUser: User = {
        id: 'google-user-' + Math.random().toString(36).substring(2, 9),
        name: 'Google User',
        email: 'user@example.com',
        photoUrl: 'https://ui-avatars.com/api/?name=Google+User&background=0D8ABC&color=fff',
      };
      
      // Store the user data
      setUser(mockGoogleUser);
      setIsLoading(false);
      
      return Promise.resolve();
    } catch (error) {
      setIsLoading(false);
      console.error('Google login failed:', error);
      return Promise.reject(error);
    }
  };

  const logout = () => {
    setUser(null);
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

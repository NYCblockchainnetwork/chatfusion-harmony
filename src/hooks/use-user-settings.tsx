
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { userSettingsService } from '@/services/userSettingsService';
import { UserSettings, UserPreferences } from '@/models/UserSettings';
import { toast } from '@/hooks/use-toast';

export function useUserSettings() {
  const { user, isAuthenticated } = useAuth();
  const [settings, setSettings] = useState<Partial<UserSettings> | null>(null);
  const [preferences, setPreferences] = useState<Partial<UserPreferences> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings when user is authenticated
  useEffect(() => {
    const loadUserSettings = async () => {
      if (isAuthenticated && user) {
        setIsLoading(true);
        try {
          const [userSettings, userPreferences] = await Promise.all([
            userSettingsService.getUserSettings(user.id),
            userSettingsService.getUserPreferences(user.id)
          ]);
          
          setSettings(userSettings);
          setPreferences(userPreferences);
          
          // Update last accessed timestamp
          if (userSettings) {
            await userSettingsService.saveUserSettings(user.id, {
              ...userSettings,
              lastAccessedAt: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('Error loading user settings:', error);
          toast({
            title: 'Error',
            description: 'Failed to load your user settings',
            variant: 'destructive',
          });
        } finally {
          setIsLoading(false);
        }
      } else {
        setSettings(null);
        setPreferences(null);
        setIsLoading(false);
      }
    };

    loadUserSettings();
  }, [isAuthenticated, user]);

  // Save settings
  const updateSettings = useCallback(async (newSettings: Partial<UserSettings>) => {
    if (!isAuthenticated || !user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to update settings',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const success = await userSettingsService.saveUserSettings(user.id, {
        ...settings,
        ...newSettings,
      });
      
      if (success) {
        setSettings(prev => prev ? { ...prev, ...newSettings } : newSettings);
      }
      
      return success;
    } catch (error) {
      console.error('Error updating settings:', error);
      return false;
    }
  }, [isAuthenticated, user, settings]);

  // Save preferences
  const updatePreferences = useCallback(async (newPreferences: Partial<UserPreferences>) => {
    if (!isAuthenticated || !user) {
      return false;
    }

    try {
      const success = await userSettingsService.saveUserPreferences(user.id, {
        ...preferences,
        ...newPreferences,
      });
      
      if (success) {
        setPreferences(prev => prev ? { ...prev, ...newPreferences } : newPreferences);
      }
      
      return success;
    } catch (error) {
      console.error('Error updating preferences:', error);
      return false;
    }
  }, [isAuthenticated, user, preferences]);

  // Save API key (to be stored securely in Supabase)
  const saveApiKey = useCallback(async (service: string, apiKey: string) => {
    if (!isAuthenticated || !user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to save API keys',
        variant: 'destructive',
      });
      return false;
    }

    return await userSettingsService.saveApiKey(user.id, service, apiKey);
  }, [isAuthenticated, user]);

  // Get API key
  const getApiKey = useCallback(async (service: string) => {
    if (!isAuthenticated || !user) return null;
    return await userSettingsService.getApiKey(user.id, service);
  }, [isAuthenticated, user]);

  return {
    settings,
    preferences,
    isLoading,
    updateSettings,
    updatePreferences,
    saveApiKey,
    getApiKey,
  };
}

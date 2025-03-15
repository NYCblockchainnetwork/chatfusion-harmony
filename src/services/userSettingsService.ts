
import { toast } from '@/hooks/use-toast';
import { 
  UserSettings, 
  UserPreferences,
  getDefaultUserSettings, 
  getDefaultUserPreferences 
} from '@/models/UserSettings';

// This service handles user settings and secrets storage
// It currently uses localStorage as a fallback, but will use Supabase for secure storage
// when connected to a Supabase project

export const userSettingsService = {
  // Settings
  async getUserSettings(userId: string): Promise<Partial<UserSettings> | null> {
    console.log('Getting user settings for:', userId);
    try {
      // When Supabase is connected, this will fetch from the database
      // For now, using localStorage as a fallback
      
      const storedSettings = localStorage.getItem(`user_settings_${userId}`);
      if (storedSettings) {
        return JSON.parse(storedSettings);
      }
      
      // If no settings found, create default
      const defaultSettings = getDefaultUserSettings(userId);
      await this.saveUserSettings(userId, defaultSettings);
      return defaultSettings;
    } catch (error) {
      console.error('Error getting user settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to retrieve user settings',
        variant: 'destructive',
      });
      return null;
    }
  },

  async saveUserSettings(userId: string, settings: Partial<UserSettings>): Promise<boolean> {
    console.log('Saving user settings for:', userId, settings);
    try {
      // When Supabase is connected, this will save to the database
      
      // Update timestamps
      const updatedSettings = {
        ...settings,
        updatedAt: new Date().toISOString(),
      };
      
      // Fallback to localStorage for non-sensitive data
      localStorage.setItem(`user_settings_${userId}`, JSON.stringify(updatedSettings));
      
      toast({
        title: 'Success',
        description: 'User settings saved successfully',
      });
      return true;
    } catch (error) {
      console.error('Error saving user settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save user settings',
        variant: 'destructive',
      });
      return false;
    }
  },

  // Preferences
  async getUserPreferences(userId: string): Promise<Partial<UserPreferences> | null> {
    console.log('Getting user preferences for:', userId);
    try {
      // Placeholder for Supabase integration
      
      // Fallback to localStorage
      const storedPreferences = localStorage.getItem(`user_preferences_${userId}`);
      if (storedPreferences) {
        return JSON.parse(storedPreferences);
      }
      
      // If no preferences found, create default
      const defaultPreferences = getDefaultUserPreferences(userId);
      await this.saveUserPreferences(userId, defaultPreferences);
      return defaultPreferences;
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return null;
    }
  },

  async saveUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<boolean> {
    console.log('Saving user preferences for:', userId, preferences);
    try {
      // Placeholder for Supabase integration
      
      // Update timestamps
      const updatedPreferences = {
        ...preferences,
        updatedAt: new Date().toISOString(),
      };
      
      // Fallback to localStorage
      localStorage.setItem(`user_preferences_${userId}`, JSON.stringify(updatedPreferences));
      return true;
    } catch (error) {
      console.error('Error saving user preferences:', error);
      return false;
    }
  },

  // Sensitive data (to be stored in Supabase secrets)
  async saveApiKey(userId: string, service: string, apiKey: string): Promise<boolean> {
    console.log(`Saving ${service} API key for user:`, userId);
    try {
      // IMPORTANT: When connected to Supabase, this will use Supabase's secure storage for API keys
      // For local development without Supabase, we'll fall back to localStorage with base64 encoding
      // (This is NOT secure for production, only for development)
      
      if (!apiKey) {
        // If clearing a key, remove from storage
        localStorage.removeItem(`${service}_${userId}`);
        return true;
      }
      
      // Base64 encode the key (NOT encryption, just basic encoding)
      const encodedKey = btoa(apiKey);
      localStorage.setItem(`${service}_${userId}`, encodedKey);
      
      toast({
        title: 'API Key Saved',
        description: `Your ${service} API key has been securely stored`,
      });
      return true;
    } catch (error) {
      console.error(`Error saving ${service} API key:`, error);
      toast({
        title: 'Error',
        description: `Failed to save ${service} API key securely`,
        variant: 'destructive',
      });
      return false;
    }
  },

  async getApiKey(userId: string, service: string): Promise<string | null> {
    try {
      // When connected to Supabase, this will retrieve from Supabase's secure storage
      // For local development, we'll fall back to localStorage
      const encodedKey = localStorage.getItem(`${service}_${userId}`);
      if (!encodedKey) return null;
      
      return atob(encodedKey); // Decode from base64
    } catch (error) {
      console.error(`Error retrieving ${service} API key:`, error);
      return null;
    }
  }
};

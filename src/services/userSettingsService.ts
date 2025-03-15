
import { toast } from '@/hooks/use-toast';
import { 
  UserSettings, 
  UserPreferences,
  getDefaultUserSettings, 
  getDefaultUserPreferences 
} from '@/models/UserSettings';

// This service will be connected to Supabase once the integration is set up
// For now, we'll use localStorage as a fallback

export const userSettingsService = {
  // Settings
  async getUserSettings(userId: string): Promise<Partial<UserSettings> | null> {
    console.log('Getting user settings for:', userId);
    try {
      // Placeholder for Supabase integration
      // When Supabase is connected, this will fetch from the database
      
      // Fallback to localStorage
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
      // Placeholder for Supabase integration
      // When Supabase is connected, this will save to the database
      
      // Update timestamps
      const updatedSettings = {
        ...settings,
        updatedAt: new Date().toISOString(),
      };
      
      // Fallback to localStorage
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
      // This should use Supabase's secure storage for API keys
      // For now, we'll encrypt and store in localStorage (not secure, just a placeholder)
      const encryptedKey = btoa(apiKey); // Basic encoding (NOT secure encryption)
      localStorage.setItem(`${service}_api_key_${userId}`, encryptedKey);
      
      toast({
        title: 'API Key Saved',
        description: `Your ${service} API key has been saved`,
      });
      return true;
    } catch (error) {
      console.error(`Error saving ${service} API key:`, error);
      toast({
        title: 'Error',
        description: `Failed to save ${service} API key`,
        variant: 'destructive',
      });
      return false;
    }
  },

  async getApiKey(userId: string, service: string): Promise<string | null> {
    try {
      // This should use Supabase's secure storage
      // For now, we'll use localStorage (not secure)
      const encryptedKey = localStorage.getItem(`${service}_api_key_${userId}`);
      if (!encryptedKey) return null;
      
      return atob(encryptedKey); // Basic decoding
    } catch (error) {
      console.error(`Error retrieving ${service} API key:`, error);
      return null;
    }
  }
};

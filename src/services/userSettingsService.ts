
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  UserSettings, 
  UserPreferences,
  getDefaultUserSettings, 
  getDefaultUserPreferences 
} from '@/models/UserSettings';

// This service handles user settings and secrets storage
// It uses Supabase for secure storage of sensitive information

export const userSettingsService = {
  // Settings
  async getUserSettings(userId: string): Promise<Partial<UserSettings> | null> {
    console.log('Getting user settings for:', userId);
    try {
      // Check if we have user settings in Supabase
      const { data: userSettings, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();
        
      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows returned
        console.error('Error fetching user settings from Supabase:', error);
        // Fall back to localStorage
        const storedSettings = localStorage.getItem(`user_settings_${userId}`);
        if (storedSettings) {
          return JSON.parse(storedSettings);
        }
      }
      
      if (userSettings) {
        return userSettings.settings;
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
      // Update timestamps
      const updatedSettings = {
        ...settings,
        updatedAt: new Date().toISOString(),
      };
      
      // Try to save to Supabase
      const { error } = await supabase
        .from('user_settings')
        .upsert(
          { 
            user_id: userId, 
            settings: updatedSettings,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id' }
        );
      
      if (error) {
        console.error('Error saving user settings to Supabase:', error);
        // Fall back to localStorage for non-sensitive data
        localStorage.setItem(`user_settings_${userId}`, JSON.stringify(updatedSettings));
      } else {
        console.log('Successfully saved user settings to Supabase');
      }
      
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
      // Try to get from Supabase
      const { data: userPreferences, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user preferences from Supabase:', error);
        // Fall back to localStorage
        const storedPreferences = localStorage.getItem(`user_preferences_${userId}`);
        if (storedPreferences) {
          return JSON.parse(storedPreferences);
        }
      }
      
      if (userPreferences) {
        return userPreferences.preferences;
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
      // Update timestamps
      const updatedPreferences = {
        ...preferences,
        updatedAt: new Date().toISOString(),
      };
      
      // Try to save to Supabase
      const { error } = await supabase
        .from('user_preferences')
        .upsert(
          { 
            user_id: userId, 
            preferences: updatedPreferences,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id' }
        );
      
      if (error) {
        console.error('Error saving user preferences to Supabase:', error);
        // Fall back to localStorage
        localStorage.setItem(`user_preferences_${userId}`, JSON.stringify(updatedPreferences));
      } else {
        console.log('Successfully saved user preferences to Supabase');
      }
      
      return true;
    } catch (error) {
      console.error('Error saving user preferences:', error);
      return false;
    }
  },

  // Sensitive data (stored in Supabase secrets)
  async saveApiKey(userId: string, service: string, apiKey: string): Promise<boolean> {
    console.log(`Saving ${service} API key for user:`, userId);
    try {
      if (!apiKey) {
        // If clearing a key, remove from Supabase
        const { error } = await supabase
          .from('user_api_keys')
          .delete()
          .eq('user_id', userId)
          .eq('service', service);
          
        if (error) {
          console.error(`Error deleting ${service} API key:`, error);
          return false;
        }
        
        // Also remove from localStorage fallback if it exists
        localStorage.removeItem(`${service}_${userId}`);
        return true;
      }
      
      // Securely save to Supabase
      const { error } = await supabase
        .from('user_api_keys')
        .upsert(
          { 
            user_id: userId, 
            service, 
            api_key: apiKey,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id, service' }
        );
      
      if (error) {
        console.error(`Error saving ${service} API key to Supabase:`, error);
        
        // As a fallback, store in localStorage with base64 encoding
        // (This is NOT secure for production, only for development)
        const encodedKey = btoa(apiKey);
        localStorage.setItem(`${service}_${userId}`, encodedKey);
        
        toast({
          title: 'Warning',
          description: `Could not securely store ${service} API key in Supabase, using fallback storage`,
          variant: 'destructive',
        });
      } else {
        console.log(`Successfully saved ${service} API key to Supabase`);
        
        // Remove from localStorage if it was previously stored there
        localStorage.removeItem(`${service}_${userId}`);
        
        toast({
          title: 'API Key Saved',
          description: `Your ${service} API key has been securely stored`,
        });
      }
      
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
      // First try to get from Supabase
      const { data, error } = await supabase
        .from('user_api_keys')
        .select('api_key')
        .eq('user_id', userId)
        .eq('service', service)
        .single();
      
      if (error) {
        console.error(`Error retrieving ${service} API key from Supabase:`, error);
        
        // Fall back to localStorage
        const encodedKey = localStorage.getItem(`${service}_${userId}`);
        if (!encodedKey) return null;
        
        return atob(encodedKey); // Decode from base64
      }
      
      if (data && data.api_key) {
        return data.api_key;
      }
      
      return null;
    } catch (error) {
      console.error(`Error retrieving ${service} API key:`, error);
      return null;
    }
  }
};

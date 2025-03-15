
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  UserSettings, 
  UserPreferences,
  getDefaultUserSettings, 
  getDefaultUserPreferences 
} from '@/models/UserSettings';

// This service handles user settings storage
// It uses Supabase for secure storage of user settings and preferences
// API keys are stored in Supabase Edge Function secrets

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
        return userSettings.settings as Partial<UserSettings>;
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
        return userPreferences.preferences as Partial<UserPreferences>;
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

  // API Keys (Stored in Supabase Edge Function Secrets)
  async saveApiKey(userId: string, service: string, apiKey: string): Promise<boolean> {
    console.log(`Saving ${service} API key for user:`, userId);
    try {
      // Call Supabase Edge Function to securely store API key
      const response = await supabase.functions.invoke('store-api-key', {
        body: { 
          userId,
          service,
          apiKey
        }
      });
      
      if (response.error) {
        console.error(`Error from edge function call:`, response.error);
        toast({
          title: 'Error',
          description: `Failed to save ${service} API key: ${response.error.message || "Unknown error"}`,
          variant: 'destructive',
        });
        return false;
      }
      
      const { data } = response;
      
      if (data && data.error) {
        console.error(`Error from edge function response:`, data.error);
        toast({
          title: 'Error',
          description: `Failed to save ${service} API key: ${data.error}`,
          variant: 'destructive',
        });
        return false;
      }
      
      console.log(`Successfully saved ${service} API key via Edge Function:`, data);
      
      // Update user settings to indicate this service is connected if needed
      if (service.startsWith('telegram_') && apiKey.trim() !== '') {
        try {
          const settings = await this.getUserSettings(userId);
          if (settings) {
            if (service === 'telegram_api_id' || service === 'telegram_api_hash') {
              // Only update if we have both keys
              const hasApiId = service === 'telegram_api_id' || await this.getApiKey(userId, 'telegram_api_id');
              const hasApiHash = service === 'telegram_api_hash' || await this.getApiKey(userId, 'telegram_api_hash');
              
              if (hasApiId && hasApiHash) {
                // Both keys present, update settings
                await this.saveUserSettings(userId, {
                  ...settings,
                  telegramIntegrationEnabled: true,
                  telegramHandles: settings.telegramHandles || []
                });
              }
            }
          }
        } catch (err) {
          console.error('Error updating settings after API key save:', err);
          // Don't fail the overall operation if just the settings update fails
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Error saving ${service} API key:`, error);
      toast({
        title: 'Error',
        description: `Failed to save ${service} API key: ${error.message || "Unknown error"}`,
        variant: 'destructive',
      });
      return false;
    }
  },

  async getApiKey(userId: string, service: string): Promise<string | null> {
    try {
      // Call Supabase Edge Function to retrieve API key
      const { data, error } = await supabase.functions.invoke('get-api-key', {
        body: { 
          userId,
          service
        }
      });
      
      if (error) {
        console.error(`Error retrieving ${service} API key:`, error);
        return null;
      }
      
      if (data && data.apiKey) {
        return data.apiKey;
      }
      
      return null;
    } catch (error) {
      console.error(`Error retrieving ${service} API key:`, error);
      return null;
    }
  }
};

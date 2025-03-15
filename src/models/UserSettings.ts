
export interface UserSettings {
  userId: string;
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  telegramIntegrationEnabled: boolean;
  telegramChatId?: string;
  pipedriveIntegrationEnabled: boolean;
  pipedriveApiKey?: string;
  lastAccessedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  userId: string;
  dashboardLayout: 'compact' | 'standard' | 'detailed';
  defaultView: 'messages' | 'contacts' | 'analytics';
  autoSync: boolean;
  syncInterval: number; // in minutes
  createdAt: string;
  updatedAt: string;
}

// Default settings to use when creating a new user
export const getDefaultUserSettings = (userId: string): Partial<UserSettings> => ({
  userId,
  theme: 'system',
  notifications: true,
  telegramIntegrationEnabled: false,
  pipedriveIntegrationEnabled: false,
  lastAccessedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const getDefaultUserPreferences = (userId: string): Partial<UserPreferences> => ({
  userId,
  dashboardLayout: 'standard',
  defaultView: 'messages',
  autoSync: true,
  syncInterval: 15, // 15 minutes default
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

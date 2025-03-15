
// Mock implementation for browsers where the Telegram client can't run
// This simulates the Telegram client API for browser environments

export async function createMockTelegramClient() {
  console.log("Creating mock Telegram client for browser environment");
  
  return {
    client: {
      connected: true,
      connect: async () => {
        console.log("Mock client connect called");
        return true;
      },
      getEntity: async (username: string) => {
        console.log(`Mock getting entity for ${username}`);
        return {
          username: username.replace('@', ''),
          firstName: 'Mock User',
          lastName: 'Test'
        };
      },
      getMessages: async (entity: any, options: any) => {
        console.log(`Mock getting messages for ${entity.username} with limit ${options.limit}`);
        
        // Return mock messages
        return Array(options.limit).fill(null).map((_, i) => ({
          id: i + 1,
          message: `This is a mock message ${i + 1} for ${entity.username}. The real Telegram client cannot run in a browser environment.`,
          date: Math.floor(Date.now() / 1000) - (i * 3600),
          media: null
        }));
      }
    },
    stringSession: {
      save: () => "mock_session_string"
    }
  };
}

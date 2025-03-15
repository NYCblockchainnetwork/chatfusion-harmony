
// Utility for retrieving Telegram messages using the Telegram client API

import { toast } from "@/hooks/use-toast";
import { createTelegramClient, TelegramCredentials } from "@/utils/telegramClient";

export interface TelegramMessage {
  id: number;
  text: string;
  timestamp: string;
  from: {
    username: string;
    firstName: string;
    lastName?: string;
  };
}

export async function fetchMessagesFromHandles(
  handles: string[],
  limit: number = 5
): Promise<Record<string, TelegramMessage[]>> {
  try {
    console.log("Starting to fetch messages for handles:", handles);
    const userId = localStorage.getItem('userId'); // Get the current user ID
    if (!userId) {
      console.error("No userId found in localStorage");
      throw new Error("User not authenticated");
    }

    // Get Telegram credentials from localStorage (in production this would be from Supabase)
    const telegramApiId = localStorage.getItem(`telegram_api_id_${userId}`);
    const telegramApiHash = localStorage.getItem(`telegram_api_hash_${userId}`);
    const telegramSessionString = localStorage.getItem(`telegram_session_${userId}`);

    console.log("Retrieved credentials:", { 
      apiId: telegramApiId ? "exists" : "missing", 
      apiHash: telegramApiHash ? "exists" : "missing",
      sessionString: telegramSessionString ? "exists" : "missing"
    });

    if (!telegramApiId || !telegramApiHash) {
      throw new Error("Telegram API credentials not found. Please set up Telegram integration first.");
    }

    // Create telegram client with credentials
    const credentials: TelegramCredentials = {
      apiId: parseInt(telegramApiId, 10),
      apiHash: telegramApiHash,
      sessionString: telegramSessionString || undefined
    };

    console.log("Creating Telegram client...");
    const { client, stringSession } = await createTelegramClient(credentials);
    
    console.log("Connecting to Telegram API...");
    try {
      // Connect to Telegram API
      await client.connect();
      console.log("Successfully connected to Telegram API");
      
      // Save the session string for future use if it changed
      const newSessionString = stringSession.save();
      if (newSessionString !== telegramSessionString) {
        console.log("Saving new session string to localStorage");
        localStorage.setItem(`telegram_session_${userId}`, newSessionString);
      }
    } catch (connectionError) {
      console.error("Failed to connect to Telegram:", connectionError);
      throw new Error(`Failed to connect to Telegram: ${connectionError.message}`);
    }
    
    // Create object to store messages for each handle
    const result: Record<string, TelegramMessage[]> = {};
    
    // Fetch messages for each handle
    for (const handle of handles) {
      const cleanHandle = handle.startsWith('@') ? handle.substring(1) : handle;
      
      try {
        console.log(`Fetching messages for @${cleanHandle}...`);
        
        // Try to resolve the username to an entity
        let entity;
        try {
          console.log(`Resolving username: @${cleanHandle}`);
          entity = await client.getEntity(`@${cleanHandle}`);
          console.log(`Successfully resolved @${cleanHandle} to entity:`, entity);
        } catch (resolveError) {
          console.error(`Failed to resolve @${cleanHandle}:`, resolveError);
          throw new Error(`Could not find Telegram user @${cleanHandle}`);
        }
        
        if (!entity) {
          throw new Error(`Could not find Telegram user @${cleanHandle}`);
        }
        
        // Now fetch messages from this entity
        try {
          console.log(`Getting messages for entity:`, entity);
          const fetchedMessages = await fetchTelegramApiMessages(client, entity, limit);
          console.log(`Successfully fetched ${fetchedMessages.length} messages for @${cleanHandle}`);
          result[cleanHandle] = fetchedMessages;
        } catch (fetchError) {
          console.error(`Error fetching messages for @${cleanHandle}:`, fetchError);
          throw new Error(`Failed to fetch messages for @${cleanHandle}: ${fetchError.message}`);
        }
      } catch (error) {
        console.error(`Error processing @${cleanHandle}:`, error);
        // Add an error message
        result[cleanHandle] = [{
          id: 0,
          text: `Error fetching messages for @${cleanHandle}: ${error.message}`,
          timestamp: new Date().toISOString(),
          from: {
            username: cleanHandle,
            firstName: 'Error',
          }
        }];
      }
    }
    
    console.log("Completed fetching messages for all handles:", Object.keys(result));
    return result;
  } catch (error) {
    console.error("Error in fetchMessagesFromHandles:", error);
    toast({
      title: "Error",
      description: error.message || "Could not fetch Telegram messages",
      variant: "destructive"
    });
    return {};
  }
}

// Helper function to fetch messages from the Telegram API
async function fetchTelegramApiMessages(client: any, entity: any, limit: number): Promise<TelegramMessage[]> {
  console.log(`Fetching up to ${limit} messages for entity...`);
  
  try {
    // This is where we would use the Telegram client to fetch actual messages
    // For now, we're implementing a more detailed simulation
    // In production, this would be replaced with real API calls
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create simulated messages but with more accurate information
    const messages: TelegramMessage[] = [];
    const currentTime = Date.now();
    
    try {
      // Get entity information
      const entityInfo = await client.getMe();
      console.log("Entity info:", entityInfo);
      
      for (let i = 0; i < limit; i++) {
        const timeOffset = i * 3600000; // One hour intervals
        const messageTime = new Date(currentTime - timeOffset);
        
        messages.push({
          id: Math.floor(Math.random() * 1000000) + i,
          text: `This is a simulated message #${i + 1}. In a production environment, this would be actual message content from the Telegram API.`,
          timestamp: messageTime.toISOString(),
          from: {
            username: entityInfo.username || "unknown",
            firstName: entityInfo.firstName || "User",
            lastName: entityInfo.lastName || undefined
          }
        });
      }
      
      console.log(`Generated ${messages.length} simulated messages for entity`);
      return messages;
    } catch (entityError) {
      console.error("Error getting entity information:", entityError);
      throw new Error(`Failed to get entity information: ${entityError.message}`);
    }
  } catch (error) {
    console.error("Error in fetchTelegramApiMessages:", error);
    throw error;
  }
}

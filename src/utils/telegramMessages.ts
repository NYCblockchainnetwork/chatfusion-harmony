
// Utility for retrieving Telegram messages using the Telegram client API

import { toast } from "@/hooks/use-toast";
import { createTelegramClient, TelegramCredentials } from "@/utils/telegramClient";
import { createMockTelegramClient } from "@/utils/telegramMockClient";

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

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

export async function fetchMessagesFromHandles(
  handles: string[],
  limit: number = 5,
  userId?: string
): Promise<Record<string, TelegramMessage[]>> {
  try {
    console.log("Starting to fetch messages for handles:", handles);
    
    // Check for userId
    if (!userId) {
      console.error("No userId provided to fetchMessagesFromHandles");
      throw new Error("User not authenticated. Please log in and try again.");
    }

    console.log("Fetching messages for user ID:", userId);

    // Get Telegram credentials from localStorage for testing
    const apiId = localStorage.getItem(`telegram_api_id_${userId}`);
    const apiHash = localStorage.getItem(`telegram_api_hash_${userId}`);
    const sessionString = localStorage.getItem(`telegram_session_${userId}`);

    console.log("Retrieved Telegram credentials:", { 
      apiId: apiId ? "exists" : "missing", 
      apiHash: apiHash ? "exists" : "missing",
      sessionString: sessionString ? "exists" : "missing"
    });

    if (!apiId || !apiHash) {
      console.error("Telegram API credentials not found");
      throw new Error("Telegram API credentials not found. Please set up Telegram integration first.");
    }

    // Create telegram client with credentials
    const credentials: TelegramCredentials = {
      apiId: parseInt(apiId, 10),
      apiHash: apiHash,
      sessionString: sessionString || undefined
    };

    console.log("Creating Telegram client with API ID:", credentials.apiId);
    
    // Determine if we should use the real client or the mock client
    if (isBrowser) {
      console.log("Using mock Telegram client for browser environment");
      return await processMockTelegramFetch(credentials, handles, limit, userId);
    } else {
      console.log("Using real Telegram client for Node.js environment");
      return await processTelegramFetch(credentials, handles, limit, userId);
    }
    
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

async function processMockTelegramFetch(
  credentials: TelegramCredentials, 
  handles: string[], 
  limit: number,
  userId: string
): Promise<Record<string, TelegramMessage[]>> {
  try {
    // Use our mock client instead
    const { client, stringSession } = await createMockTelegramClient();
    
    // Create object to store messages for each handle
    const result: Record<string, TelegramMessage[]> = {};
    
    // Fetch messages for each handle
    for (const handle of handles) {
      const cleanHandle = handle.startsWith('@') ? handle.substring(1) : handle;
      
      try {
        console.log(`Fetching mock messages for @${cleanHandle}...`);
        
        // Resolve username to entity
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
        
        // Fetch mock messages
        try {
          console.log(`Getting mock messages for entity:`, entity);
          
          // Fetch most recent messages from this chat
          const fetchedMessages = await client.getMessages(entity, {
            limit: limit
          });
          
          console.log(`Successfully fetched ${fetchedMessages.length} mock messages for @${cleanHandle}`);
          
          // Transform the messages to our format
          const transformedMessages = fetchedMessages.map(msg => {
            return {
              id: msg.id,
              text: msg.message || "(No text content)",
              timestamp: new Date(msg.date * 1000).toISOString(),
              from: {
                username: entity.username || "unknown",
                firstName: entity.firstName || "User",
                lastName: entity.lastName
              }
            };
          });
          
          result[cleanHandle] = transformedMessages;
          console.log(`Transformed ${transformedMessages.length} messages for @${cleanHandle}`);
        } catch (fetchError) {
          console.error(`Error fetching mock messages for @${cleanHandle}:`, fetchError);
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
    
    console.log("Completed fetching mock messages for all handles:", Object.keys(result));
    return result;
  } catch (error) {
    console.error("Error in processMockTelegramFetch:", error);
    throw error;
  }
}

// The original function renamed to differentiate
async function processTelegramFetch(
  credentials: TelegramCredentials, 
  handles: string[], 
  limit: number,
  userId: string
): Promise<Record<string, TelegramMessage[]>> {
  try {
    const { client, stringSession } = await createTelegramClient(credentials);
    
    console.log("Connecting to Telegram API...");
    try {
      // Connect to Telegram API - for real this time
      if (!client.connected) {
        await client.connect();
        console.log("Successfully connected to Telegram API");
      }
      
      // Save the session string for future use
      const newSessionString = stringSession.save();
      if (newSessionString !== credentials.sessionString) {
        console.log("Saving new session string");
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
        
        // Resolve username to entity
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
        
        // Fetch actual messages
        try {
          console.log(`Getting messages for entity:`, entity);
          
          // Fetch most recent messages from this chat
          const fetchedMessages = await client.getMessages(entity, {
            limit: limit
          });
          
          console.log(`Successfully fetched ${fetchedMessages.length} messages for @${cleanHandle}`);
          
          // Transform the messages to our format
          const transformedMessages = fetchedMessages.map(msg => {
            // Handle different message types and extract text content
            const messageText = getMessageText(msg);
            
            return {
              id: msg.id,
              text: messageText || "(No text content)",
              timestamp: new Date(msg.date * 1000).toISOString(),
              from: {
                username: entity.username || "unknown",
                firstName: entity.firstName || "User",
                lastName: entity.lastName
              }
            };
          });
          
          result[cleanHandle] = transformedMessages;
          console.log(`Transformed ${transformedMessages.length} messages for @${cleanHandle}`);
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
    console.error("Error in processTelegramFetch:", error);
    throw error;
  }
}

// Helper function to extract text from different message types
function getMessageText(message: any): string {
  if (!message) return "";
  
  // Handle regular text messages
  if (message.message) {
    return message.message;
  }
  
  // Handle messages with media
  if (message.media) {
    const mediaType = message.media.className || message.media._typeName || "unknown media";
    return `[${mediaType}] ${message.message || ""}`;
  }
  
  // Other message types
  return message.text || message.caption || "(Non-text content)";
}


// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://dzispzcdylajxkbufjfd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6aXNwemNkeWxhanhrYnVmamZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwMTExNDYsImV4cCI6MjA1NzU4NzE0Nn0.DXw5JUS4b3q4SILoEAf_kWvQBm6Jowm1FJocV0AHJck";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Create a specialized client for telegram operations
export const telegramClient = {
  // Helper method to get auth token
  async getAuthHeaders() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw new Error("No active session. Please login again.");
    }
    return {
      Authorization: `Bearer ${data.session.access_token}`
    };
  },
  
  // Get all sessions for the current user
  async getSessions(userId: string) {
    console.log(`Getting telegram sessions for user ${userId}`);
    return await supabase
      .from('telegram_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
  },
  
  // Get a specific session by id
  async getSessionById(sessionId: string) {
    console.log(`Getting telegram session with ID ${sessionId}`);
    return await supabase
      .from('telegram_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
  },
  
  // Get a session by phone number
  async getSessionByPhone(userId: string, phone: string) {
    console.log(`Getting telegram session for user ${userId} with phone ${phone}`);
    return await supabase
      .from('telegram_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('phone', phone)
      .single();
  },
  
  // Delete a session
  async deleteSession(sessionId: string) {
    console.log(`Deleting telegram session with ID ${sessionId}`);
    return await supabase
      .from('telegram_sessions')
      .delete()
      .eq('id', sessionId);
  },

  // Send verification code to phone number
  async sendCode(phone: string, userId: string) {
    console.log(`Sending verification code to ${phone} for user ${userId}`);
    
    // Get auth headers
    const headers = await this.getAuthHeaders();
    
    const { data, error } = await supabase.functions.invoke('telegram-auth/send-code', {
      body: { phone, userId },
      headers
    });
    
    if (error) {
      console.error("Error calling telegram-auth/send-code:", error);
      throw new Error(`Failed to send verification code: ${error.message}`);
    }
    
    return data;
  },
  
  // Verify the code and create a session
  async verifyCode(phone: string, code: string, phoneCodeHash: string, userId: string) {
    console.log(`Verifying code for ${phone}, user ${userId}`);
    
    // Get auth headers
    const headers = await this.getAuthHeaders();
    
    const { data, error } = await supabase.functions.invoke('telegram-auth/verify-code', {
      body: { phone, code, phoneCodeHash, userId },
      headers
    });
    
    if (error) {
      console.error("Error calling telegram-auth/verify-code:", error);
      throw new Error(`Failed to verify code: ${error.message}`);
    }
    
    return data;
  },
  
  // Get Telegram API credentials from the edge function
  async getApiCredentials(userId: string) {
    console.log(`Getting Telegram API credentials for user ${userId}`);
    
    try {
      // Get auth headers with valid token
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("No active session. Please login again.");
      }
      
      const { data, error } = await supabase.functions.invoke('get-telegram-credentials', {
        body: { userId },
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`
        }
      });
      
      if (error) {
        console.error("Error calling get-telegram-credentials:", error);
        throw new Error(`Failed to get credentials: ${error.message}`);
      }
      
      if (!data || !data.apiId || !data.apiHash) {
        throw new Error("Invalid credentials response from server");
      }
      
      return {
        apiId: data.apiId,
        apiHash: data.apiHash
      };
    } catch (error) {
      console.error("Error in getApiCredentials:", error);
      throw new Error(`Authentication error: ${error.message}`);
    }
  }
};

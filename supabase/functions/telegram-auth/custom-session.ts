
// Custom session implementation using GRM for Telegram client in Deno environment
// This is a StringSession compatible implementation based on GRM's recommended patterns

import { StringSession } from "https://esm.sh/telegram@2.26.22/sessions";
import { GramJs } from "https://esm.sh/@grm/core@1.6.7";

export class CustomStringSession extends StringSession {
  private _session: string;

  constructor(session = "") {
    super();
    this._session = session || "";
    // Initialize GRM for better session handling
    GramJs.initSession(this);
  }

  // Method to check if this is a valid StringSession
  get _databaseKey() {
    return "string";
  }

  // Standard methods required for the session interface
  save(): string {
    return this._session;
  }

  load(session: string) {
    this._session = session;
  }

  // Returns the string representation of the session
  toString(): string {
    return this._session;
  }

  // Method to explicitly identify this as a StringSession
  get classType() {
    return "string";
  }

  // Essential methods for StringSession compatibility
  getSession() {
    return this._session;
  }

  setSession(value: string) {
    this._session = value;
  }

  // Method to identify this as a StringSession for the Telegram client
  get sessionType() {
    return "string";
  }

  // Helper methods for easier usage
  getString() {
    return this._session;
  }

  setString(value: string) {
    this._session = value;
  }

  // Required for JSON serialization
  toJSON() {
    return {
      sessionType: "string",
      session: this._session
    };
  }
  
  // Required for detection as a StringSession
  static isAvailable() {
    return true;
  }
  
  // Enhanced encode and decode methods using GRM's utilities
  encode(data: any): string {
    try {
      if (typeof data === 'string') {
        return data;
      }
      
      // Use GRM's encoding utilities if available
      if (GramJs.Utils && GramJs.Utils.encodeSession) {
        return GramJs.Utils.encodeSession(data);
      }
      
      // Fallback to JSON stringification
      if (data && typeof data === 'object') {
        return JSON.stringify(data);
      }
      
      return String(data || '');
    } catch (e) {
      console.error("Session encode error:", e);
      return '';
    }
  }
  
  decode(encoded: string): any {
    try {
      // Use GRM's decoding utilities if available
      if (GramJs.Utils && GramJs.Utils.decodeSession) {
        return GramJs.Utils.decodeSession(encoded);
      }
      
      // Try to parse as JSON
      try {
        return JSON.parse(encoded);
      } catch (e) {
        // If not JSON, return as is
        return encoded;
      }
    } catch (e) {
      console.error("Session decode error:", e);
      return encoded;
    }
  }
}

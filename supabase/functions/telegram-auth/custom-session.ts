
// Custom session implementation for Telegram client in Deno environment
// This is a StringSession compatible implementation
export class CustomStringSession {
  private _session: string;

  constructor(session = "") {
    this._session = session;
  }

  // Method to check if this is a valid StringSession
  // This helps the Telegram client identify this as a proper StringSession
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
  
  // Additional compatibility methods
  encode(data: any): string {
    if (typeof data === 'string') {
      return data;
    }
    return '';
  }
  
  decode(encoded: string): any {
    return encoded;
  }
}

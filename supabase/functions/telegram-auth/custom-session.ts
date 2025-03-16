
// Custom session implementation for Telegram client in Deno environment
export class CustomStringSession {
  private _session: string;

  constructor(session = "") {
    this._session = session;
  }

  // Standard methods required for the session interface
  save(): string {
    return this._session;
  }

  load(session: string) {
    this._session = session;
  }

  // Extra methods to ensure compatibility
  getString() {
    return this._session;
  }

  setString(value: string) {
    this._session = value;
  }

  // Specific methods required for the StringSession interface
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

  toJSON() {
    return {
      sessionType: "string",
      session: this._session
    };
  }
}

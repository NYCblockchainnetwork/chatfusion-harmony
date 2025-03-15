
// Custom session implementation for Telegram client in Deno environment
export class CustomStringSession {
  private _session: string;

  constructor(session = "") {
    this._session = session;
  }

  save(): string {
    return this._session;
  }

  load(session: string) {
    this._session = session;
  }

  getString() {
    return this._session;
  }

  setString(value: string) {
    this._session = value;
  }
}

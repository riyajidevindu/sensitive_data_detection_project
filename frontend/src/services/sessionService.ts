/**
 * Session Management Service
 * Handles session ID storage and retrieval for multi-user isolation
 */

const SESSION_KEY = 'sensitive_data_detector_session_id';

export class SessionService {
  /**
   * Get current session ID from localStorage
   */
  static getSessionId(): string | null {
    return localStorage.getItem(SESSION_KEY);
  }

  /**
   * Set session ID in localStorage
   */
  static setSessionId(sessionId: string): void {
    localStorage.setItem(SESSION_KEY, sessionId);
  }

  /**
   * Remove session ID from localStorage
   */
  static clearSession(): void {
    localStorage.removeItem(SESSION_KEY);
  }

  /**
   * Check if session exists
   */
  static hasSession(): boolean {
    return this.getSessionId() !== null;
  }

  /**
   * Get session header object for API requests
   */
  static getSessionHeader(): { 'X-Session-ID': string } | {} {
    const sessionId = this.getSessionId();
    return sessionId ? { 'X-Session-ID': sessionId } : {};
  }
}

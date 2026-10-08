/** In-memory + optional persistence via a tiny JSON file is overkill; module session for offline demo. */
export type MobileSession = { role: string; title: string };

let session: MobileSession | null = null;

export function getSession(): MobileSession | null {
  return session;
}

export function setSession(next: MobileSession | null) {
  session = next;
}

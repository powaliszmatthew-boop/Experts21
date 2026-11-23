import type { Conversations } from "./types";

const KEY = "experts21.conversations.v1";

export function loadConversations(): Conversations {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const data = JSON.parse(raw) as Conversations;
    // Anything still "streaming" when the page closed was interrupted.
    for (const turns of Object.values(data)) {
      for (const t of turns) {
        if (t.kind === "reply" && t.status === "streaming") t.status = "partial";
        if (t.kind === "team" && t.phase !== "done" && t.phase !== "error") {
          t.phase = "error";
          t.error = "Interrupted when the page was closed.";
        }
      }
    }
    return data;
  } catch {
    return {};
  }
}

export function saveConversations(c: Conversations) {
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    /* storage full or unavailable: chats just won't persist */
  }
}

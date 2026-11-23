import { useState } from "react";
import { passwordStore } from "../api";

export function PasswordDialog({ onClose }: { onClose: () => void }) {
  const [value, setValue] = useState("");
  return (
    <div className="dialog-backdrop" role="dialog" aria-modal="true" aria-labelledby="pw-title">
      <form
        className="dialog"
        onSubmit={(e) => {
          e.preventDefault();
          passwordStore.set(value || null);
          onClose();
        }}
      >
        <h2 id="pw-title">Password required</h2>
        <p>This site is protected. Enter the password set in Netlify's <code>APP_PASSWORD</code> variable. It is saved in this browser only.</p>
        <input type="password" autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder="Password" />
        <div className="dialog-actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={!value}>
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

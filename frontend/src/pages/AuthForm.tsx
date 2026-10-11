import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link } from "react-router-dom";
import { extractErrorMessage } from "../api/client";
import type { Credentials } from "../api/auth";

/** The email + password form shared by log in and sign up (parents only). */
export function AuthForm({
  title,
  intro,
  submitLabel,
  busyLabel,
  newPassword,
  onSubmit,
  footer,
}: {
  title: string;
  intro?: ReactNode;
  submitLabel: string;
  busyLabel: string;
  newPassword?: boolean;
  onSubmit: (input: Credentials) => Promise<void>;
  footer: ReactNode;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await onSubmit({ email, password });
    } catch (err) {
      setError(extractErrorMessage(err, "Something went wrong. Try again."));
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <Link to="/" className="back-link">
        ‹ Back
      </Link>
      <div className="card">
        <h1>{title}</h1>
        {intro}
        <form onSubmit={handleSubmit} className="form">
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete={newPassword ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={newPassword ? 8 : undefined}
              required
            />
            {newPassword && <span className="hint">At least 8 characters.</span>}
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? busyLabel : submitLabel}
          </button>
        </form>
        <p className="card-footer">{footer}</p>
      </div>
    </main>
  );
}

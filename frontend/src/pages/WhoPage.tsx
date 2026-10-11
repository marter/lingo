import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { fetchFamily, startChildSession } from "../api/auth";
import { extractErrorMessage, isUnauthorized } from "../api/client";
import { useSession } from "../session/SessionContext";
import type { Child } from "../types";

/** "Who's learning?" Kids tap their own profile; no passwords for kids. */
export function WhoPage() {
  const { startChild, logout } = useSession();
  const navigate = useNavigate();
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const family = useQuery({ queryKey: ["family"], queryFn: fetchFamily, retry: false });

  // The device's login expired: log out, and FamilyRoute sends us to the landing page.
  const expired = family.isError && isUnauthorized(family.error);
  useEffect(() => {
    if (expired) logout();
  }, [expired, logout]);

  async function pick(child: Child) {
    setStarting(child.id);
    setError(null);
    try {
      startChild(await startChildSession(child.id));
      navigate("/learn");
    } catch (err) {
      setError(extractErrorMessage(err, "Couldn't start. Try again."));
      setStarting(null);
    }
  }

  const children = family.data?.children ?? [];

  return (
    <main className="page page-center">
      <h1>Who's learning?</h1>
      {family.isLoading && <p className="hint">Loading…</p>}
      {family.isSuccess && children.length === 0 && (
        <p className="lead">Ask a grown-up to add your profile.</p>
      )}
      <div className="profile-grid">
        {children.map((child) => (
          <button
            key={child.id}
            type="button"
            className="profile-tile"
            onClick={() => pick(child)}
            disabled={starting !== null}
          >
            <span className="profile-avatar" aria-hidden="true">
              {child.avatar}
            </span>
            <span className="profile-name">{child.nickname}</span>
          </button>
        ))}
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <Link to="/parent" className="btn btn-ghost grownups-link">
        🔒 Grown-ups
      </Link>
    </main>
  );
}

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { fetchFamily, unlockWithPin } from "../api/auth";
import { extractErrorMessage, isUnauthorized } from "../api/client";
import { fetchOptions, fetchParentMe, resendVerification } from "../api/parent";
import { PinPad } from "../components/PinPad";
import { useSession } from "../session/SessionContext";
import type { Child, ParentMe } from "../types";
import { ChildFormSheet } from "./parent/ChildFormSheet";
import { PinSetupSheet } from "./parent/PinSetupSheet";
import { RemoveChildSheet } from "./parent/RemoveChildSheet";

/** The grown-ups' area. Needs the PIN (or a fresh password login) on a shared device. */
export function ParentPage() {
  const { parentUnlocked } = useSession();
  return parentUnlocked ? <ParentHome /> : <ParentGate />;
}

function ParentGate() {
  const { unlockParent } = useSession();
  const family = useQuery({ queryKey: ["family"], queryFn: fetchFamily, retry: false });

  return (
    <main className="page page-center">
      <Link to="/who" className="back-link back-link-corner">
        ‹ Back to kids
      </Link>
      <h1>Grown-ups only</h1>
      {family.data?.has_pin === false ? (
        <div className="card">
          <p className="hint">You haven't set a PIN yet. Log in with your password instead.</p>
          <Link to="/login" className="btn btn-primary">
            Log in
          </Link>
        </div>
      ) : (
        <>
          <PinPad
            prompt="Enter your PIN"
            onComplete={async (pin) => {
              try {
                unlockParent(await unlockWithPin(pin));
                return null;
              } catch (err) {
                return extractErrorMessage(err, "Couldn't check the PIN. Try again.");
              }
            }}
          />
          <Link to="/login" className="hint-link">
            Forgot your PIN? Log in with your password
          </Link>
        </>
      )}
    </main>
  );
}

type SheetState =
  | { kind: "add" }
  | { kind: "edit"; child: Child }
  | { kind: "remove"; child: Child }
  | { kind: "pin" }
  | null;

function ParentHome() {
  const { lockParent, logout } = useSession();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState<SheetState>(null);
  const me = useQuery({ queryKey: ["parent", "me"], queryFn: fetchParentMe, retry: false });

  // The 30-minute parent session ran out: lock, which shows the PIN pad again.
  const expired = me.isError && isUnauthorized(me.error);
  useEffect(() => {
    if (expired) lockParent();
  }, [expired, lockParent]);

  function handToKids() {
    lockParent();
    navigate("/who");
  }

  function logOutDevice() {
    if (!window.confirm("Log out on this device? Kids won't be able to use Lingo here until you log in again.")) {
      return;
    }
    logout();
    navigate("/");
  }

  if (!me.data) {
    return (
      <main className="page">
        <p className="hint">{me.isError ? "Couldn't load your account." : "Loading…"}</p>
      </main>
    );
  }
  const parent = me.data;

  return (
    <main className="page">
      <header className="parent-header">
        <div>
          <h1>Grown-ups</h1>
          <p className="hint">{parent.email}</p>
        </div>
        <button type="button" className="btn btn-primary btn-small" onClick={handToKids}>
          Done
        </button>
      </header>

      <SetupSteps parent={parent} onSetPin={() => setSheet({ kind: "pin" })} />

      <section className="card">
        <h2>Kids</h2>
        {parent.children.length === 0 ? (
          <p className="hint">No profiles yet.</p>
        ) : (
          <ul className="child-list">
            {parent.children.map((child) => (
              <li key={child.id} className="child-row">
                <span className="child-row-avatar" aria-hidden="true">
                  {child.avatar}
                </span>
                <span className="child-row-text">
                  <strong>{child.nickname}</strong>
                  <span className="hint">Ages {child.age_band}</span>
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  onClick={() => setSheet({ kind: "edit", child })}
                >
                  Edit
                </button>
              </li>
            ))}
          </ul>
        )}
        <AddChildButton parent={parent} onAdd={() => setSheet({ kind: "add" })} />
      </section>

      <section className="card">
        <h2>This device</h2>
        <div className="stack">
          {parent.has_pin && (
            <button type="button" className="btn btn-secondary" onClick={() => setSheet({ kind: "pin" })}>
              Change PIN
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={logOutDevice}>
            Log out on this device
          </button>
        </div>
      </section>

      {sheet?.kind === "add" && <ChildFormSheet onClose={() => setSheet(null)} />}
      {sheet?.kind === "edit" && (
        <ChildFormSheet
          child={sheet.child}
          onClose={() => setSheet(null)}
          onRemove={() => setSheet({ kind: "remove", child: sheet.child })}
        />
      )}
      {sheet?.kind === "remove" && (
        <RemoveChildSheet child={sheet.child} onClose={() => setSheet(null)} />
      )}
      {sheet?.kind === "pin" && (
        <PinSetupSheet changing={parent.has_pin} onClose={() => setSheet(null)} />
      )}
    </main>
  );
}

function AddChildButton({ parent, onAdd }: { parent: ParentMe; onAdd: () => void }) {
  const options = useQuery({ queryKey: ["parent", "options"], queryFn: fetchOptions });
  if (options.data && parent.children.length >= options.data.max_children) {
    return <p className="hint">That's the most profiles a family can have.</p>;
  }
  return (
    <button
      type="button"
      className="btn btn-primary"
      onClick={onAdd}
      disabled={!parent.email_verified}
    >
      + Add a kid
    </button>
  );
}

/** Shown until the account is fully set up: confirm email, then choose a PIN. */
function SetupSteps({ parent, onSetPin }: { parent: ParentMe; onSetPin: () => void }) {
  const queryClient = useQueryClient();
  const [resend, setResend] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  if (parent.email_verified && parent.has_pin) return null;

  async function sendAgain() {
    setError(null);
    setResend("sending");
    try {
      await resendVerification();
      setResend("sent");
    } catch (err) {
      setError(extractErrorMessage(err, "Couldn't send the email."));
      setResend("idle");
    }
  }

  return (
    <section className="card card-highlight">
      <h2>Finish setting up</h2>
      <ol className="steps">
        <li className={parent.email_verified ? "done" : ""}>
          <strong>Confirm your email.</strong>{" "}
          {parent.email_verified ? (
            "Done."
          ) : (
            <>
              We sent a link to {parent.email}. Check your spam folder too. You can add kids
              once it's confirmed.
              <span className="step-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["parent", "me"] })}
                >
                  I've confirmed it
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  onClick={sendAgain}
                  disabled={resend !== "idle"}
                >
                  {resend === "sent" ? "Sent" : resend === "sending" ? "Sending…" : "Send again"}
                </button>
              </span>
              {error && <span className="form-error">{error}</span>}
            </>
          )}
        </li>
        <li className={parent.has_pin ? "done" : ""}>
          <strong>Choose a 4-digit PIN.</strong>{" "}
          {parent.has_pin ? (
            "Done."
          ) : (
            <>
              It keeps kids out of this page when they use your device.
              <span className="step-actions">
                <button type="button" className="btn btn-secondary btn-small" onClick={onSetPin}>
                  Choose PIN
                </button>
              </span>
            </>
          )}
        </li>
      </ol>
    </section>
  );
}

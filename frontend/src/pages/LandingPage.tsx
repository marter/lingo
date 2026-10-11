import { Link, Navigate } from "react-router-dom";
import { useSession } from "../session/SessionContext";

/** Logged-out visitors (parents) see this; a set-up device goes straight to the kids. */
export function LandingPage() {
  const { hasFamily, hasChild } = useSession();
  if (hasChild) return <Navigate to="/learn" replace />;
  if (hasFamily) return <Navigate to="/who" replace />;

  return (
    <main className="page page-center">
      <div className="mascot" aria-hidden="true">
        🦜
      </div>
      <h1>¡Hola! I'm Lingo.</h1>
      <p className="lead">Short, playful Spanish lessons for kids 7 and up.</p>
      <div className="stack">
        <Link to="/register" className="btn btn-primary">
          Grown-ups: create a family account
        </Link>
        <Link to="/login" className="btn btn-secondary">
          Log in
        </Link>
      </div>
      <p className="fine-print">
        Kids don't sign up. A parent creates the account and adds each kid with just a
        nickname. No ads, no trackers, no chat.
      </p>
    </main>
  );
}

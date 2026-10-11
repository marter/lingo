import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { verifyEmail } from "../api/auth";
import { extractErrorMessage } from "../api/client";
import { useSession } from "../session/SessionContext";

/** Opened from the emailed link. Works whether or not you're logged in on this device. */
export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const { hasFamily } = useSession();
  const queryClient = useQueryClient();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    token ? null : { ok: false, message: "This link is missing its code." },
  );
  const started = useRef(false);

  useEffect(() => {
    // Guard against StrictMode's double effect so the token is only submitted once.
    if (!token || started.current) return;
    started.current = true;
    verifyEmail(token)
      .then(() => {
        setResult({ ok: true, message: "Thanks! You can add your kids' profiles now." });
        queryClient.invalidateQueries();
      })
      .catch((err) =>
        setResult({ ok: false, message: extractErrorMessage(err, "That link didn't work.") }),
      );
  }, [token, queryClient]);

  return (
    <main className="page page-center">
      <div className="card">
        <h1>{result === null ? "Confirming…" : result.ok ? "Email confirmed" : "Link problem"}</h1>
        {result && <p className="hint">{result.message}</p>}
        {result && (
          <Link to={hasFamily ? "/parent" : "/login"} className="btn btn-primary">
            {hasFamily ? "Set up profiles" : "Log in"}
          </Link>
        )}
      </div>
    </main>
  );
}

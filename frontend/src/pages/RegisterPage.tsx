import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { fetchRegistrationOpen, register } from "../api/auth";
import { useSession } from "../session/SessionContext";
import { AuthForm } from "./AuthForm";

export function RegisterPage() {
  const { signIn } = useSession();
  const navigate = useNavigate();
  const { data: open } = useQuery({
    queryKey: ["registration-open"],
    queryFn: fetchRegistrationOpen,
  });

  if (open === false) {
    return (
      <main className="page">
        <div className="card">
          <h1>Sign-ups are closed</h1>
          <p className="hint">Lingo is limited to a few families for now, and it's full.</p>
          <p className="card-footer">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <AuthForm
      title="Create a family account"
      intro={
        <p className="hint">
          For parents and guardians. We'll email you a link to confirm your address, then you
          can add your kids with just a nickname.
        </p>
      }
      submitLabel="Create account"
      busyLabel="Creating…"
      newPassword
      onSubmit={async (input) => {
        signIn(await register(input));
        navigate("/parent");
      }}
      footer={
        <>
          Already have an account? <Link to="/login">Log in</Link>
        </>
      }
    />
  );
}

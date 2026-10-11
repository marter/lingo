import { Link, useNavigate } from "react-router-dom";
import { login } from "../api/auth";
import { useSession } from "../session/SessionContext";
import { AuthForm } from "./AuthForm";

/** Parents only. Also how a parent gets back in after forgetting the PIN. */
export function LoginPage() {
  const { signIn } = useSession();
  const navigate = useNavigate();

  return (
    <AuthForm
      title="Grown-up log in"
      submitLabel="Log in"
      busyLabel="Logging in…"
      onSubmit={async (input) => {
        signIn(await login(input));
        navigate("/parent");
      }}
      footer={
        <>
          New here? <Link to="/register">Create a family account</Link>
        </>
      }
    />
  );
}

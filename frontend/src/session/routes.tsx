import { Navigate, Outlet } from "react-router-dom";
import { useSession } from "./SessionContext";

/** Pages for a device a parent has logged in on (the picker, the parent area). */
export function FamilyRoute() {
  const { hasFamily } = useSession();
  return hasFamily ? <Outlet /> : <Navigate to="/" replace />;
}

/** Pages for a kid's session. */
export function ChildRoute() {
  const { hasFamily, hasChild } = useSession();
  if (!hasFamily) return <Navigate to="/" replace />;
  return hasChild ? <Outlet /> : <Navigate to="/who" replace />;
}

import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { isFresh, tokens } from "../api/client";
import type { LoginResponse } from "../api/auth";

interface SessionState {
  /** A parent has logged in on this device (kids can use the picker). */
  hasFamily: boolean;
  /** The parent area is unlocked right now. */
  parentUnlocked: boolean;
  /** A kid's session is active. */
  hasChild: boolean;
}

interface SessionActions {
  signIn: (response: LoginResponse) => void;
  unlockParent: (parentToken: string) => void;
  lockParent: () => void;
  startChild: (childToken: string) => void;
  endChild: () => void;
  logout: () => void;
}

type SessionValue = SessionState & SessionActions;

const SessionContext = createContext<SessionValue | null>(null);

function snapshot(): SessionState {
  return {
    hasFamily: tokens.family.get() !== null,
    parentUnlocked: isFresh(tokens.parent.get()),
    hasChild: tokens.child.get() !== null,
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState(snapshot);

  // Memoized so pages can list these functions as effect dependencies.
  const actions = useMemo<SessionActions>(() => {
    const sync = () => setState(snapshot());
    return {
      signIn: (response) => {
        tokens.child.clear();
        tokens.family.set(response.family_token);
        tokens.parent.set(response.parent_token);
        queryClient.clear();
        sync();
      },
      unlockParent: (parentToken) => {
        tokens.parent.set(parentToken);
        sync();
      },
      lockParent: () => {
        tokens.parent.clear();
        queryClient.removeQueries({ queryKey: ["parent"] });
        sync();
      },
      startChild: (childToken) => {
        tokens.parent.clear(); // handing the device to a kid locks the parent area
        tokens.child.set(childToken);
        queryClient.removeQueries({ queryKey: ["child"] });
        sync();
      },
      endChild: () => {
        tokens.child.clear();
        queryClient.removeQueries({ queryKey: ["child"] });
        sync();
      },
      logout: () => {
        tokens.clearAll();
        queryClient.clear();
        sync();
      },
    };
  }, [queryClient]);

  const value = useMemo(() => ({ ...state, ...actions }), [state, actions]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}

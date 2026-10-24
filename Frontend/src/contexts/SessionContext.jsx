import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { api } from "../lib/api";
import { SERVER_URL } from "../lib/config";

// Who is playing, their demo balance, and the one live connection to the
// server. Signed out, the socket still connects so anyone can watch rounds.
const SessionContext = createContext(null);
const TOKEN_KEY = "qikwins.token";

const readToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export function SessionProvider({ children }) {
  const [token, setToken] = useState(readToken);
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!readToken());
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!token) return;
    api("/me", { token })
      .then((data) => setUser(data.user))
      .catch((e) => {
        if (e.status === 401) {
          setToken(null);
          try {
            localStorage.removeItem(TOKEN_KEY);
          } catch {
            /* private mode */
          }
        }
      })
      .finally(() => setReady(true));
  }, [token]);

  // Reconnect with the new token whenever someone signs in or out.
  useEffect(() => {
    const s = io(SERVER_URL, { auth: { token }, transports: ["websocket", "polling"] });
    s.on("wallet", ({ balance }) => setUser((u) => (u ? { ...u, balance } : u)));
    setSocket(s);
    return () => s.disconnect();
  }, [token]);

  const signIn = useCallback((newToken, newUser) => {
    try {
      localStorage.setItem(TOKEN_KEY, newToken);
    } catch {
      /* private mode */
    }
    setToken(newToken);
    setUser(newUser);
  }, []);

  const signOut = useCallback(() => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* private mode */
    }
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ token, user, setUser, ready, socket, signIn, signOut }), [token, user, ready, socket, signIn, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export const useSession = () => useContext(SessionContext);

import { useCallback, useEffect, useState } from "react";
import { useSession } from "../contexts/SessionContext";
import { api } from "./api";

// Your own game ("double" or "seven"): your queue spot, match or table,
// fetched with your token and pushed over the socket as it changes.
export function usePersonal(game) {
  const { socket, token } = useSession();
  const [state, setState] = useState(null);

  const refresh = useCallback(() => api(`/games/${game}`, { token }).then(setState).catch(() => {}), [game, token]);
  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!socket) return undefined;
    const onState = (data) => setState(data);
    const onLobby = (lobby) => setState((s) => (s ? { ...s, lobby } : s));
    socket.on(`${game}:state`, onState);
    socket.on(`${game}:lobby`, onLobby);
    socket.on("connect", refresh);
    return () => {
      socket.off(`${game}:state`, onState);
      socket.off(`${game}:lobby`, onLobby);
      socket.off("connect", refresh);
    };
  }, [socket, game, refresh]);

  return [state, setState];
}

// Lobby counters for a personal game, for anyone (signed in or not).
export function useLobby(game) {
  const { socket } = useSession();
  const [lobby, setLobby] = useState(null);
  useEffect(() => {
    api(`/games/${game}`)
      .then((d) => setLobby(d.lobby))
      .catch(() => {});
  }, [game]);
  useEffect(() => {
    if (!socket) return undefined;
    socket.on(`${game}:lobby`, setLobby);
    return () => socket.off(`${game}:lobby`, setLobby);
  }, [socket, game]);
  return lobby;
}

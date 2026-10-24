import { useEffect, useState } from "react";
import { useSession } from "../contexts/SessionContext";
import { api } from "./api";

// Live state of one game ("hop-off" or "underdog"): fetched once, then kept
// up to date over the socket while the screen is open.
export function useGame(game) {
  const { socket } = useSession();
  const [state, setState] = useState(null);

  useEffect(() => {
    api(`/games/${game}`).then(setState).catch(() => {});
  }, [game]);

  useEffect(() => {
    if (!socket) return undefined;
    const event = `${game}:state`;
    const watch = () => socket.emit("watch", game);
    socket.on(event, setState);
    socket.on("connect", watch);
    if (socket.connected) watch();
    return () => {
      socket.off(event, setState);
      socket.off("connect", watch);
      socket.emit("unwatch", game);
    };
  }, [socket, game]);

  return [state, setState];
}

// Seconds left until `endsAt`, ticking.
export function useCountdown(endsAt) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  if (!endsAt) return 0;
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

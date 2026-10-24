// Where the QikWins server lives. VITE_SERVER_URL wins; otherwise the same
// machine on port 3000, so a phone on the same Wi-Fi works in development.
export const SERVER_URL =
  import.meta.env.VITE_SERVER_URL?.replace(/\/$/, "") ||
  `${window.location.protocol}//${window.location.hostname}:3000`;

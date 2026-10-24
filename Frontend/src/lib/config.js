// Where the QikWins server lives. VITE_SERVER_URL wins ("/" means the same
// site, as on Render, where the server also serves this website); otherwise
// the same machine on port 3000, so a phone on the same Wi-Fi works in
// development.
const configured = import.meta.env.VITE_SERVER_URL;
export const SERVER_URL =
  configured === "/"
    ? window.location.origin
    : configured?.replace(/\/$/, "") || `${window.location.protocol}//${window.location.hostname}:3000`;

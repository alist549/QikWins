import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { ThemeProvider } from "./contexts/ThemeContext.jsx";
import { SessionProvider } from "./contexts/SessionContext.jsx";

createRoot(document.getElementById("root")).render(
  <ThemeProvider>
    <SessionProvider>
      <App />
    </SessionProvider>
  </ThemeProvider>
);

import { createContext, useContext, useEffect, useState } from "react";

// Light, dark or follow the phone's setting. Stored per device.
const ThemeContext = createContext({ theme: "system", resolved: "light", setTheme: () => {} });

const media = () => window.matchMedia?.("(prefers-color-scheme: dark)");
const readStored = () => {
  try {
    return localStorage.getItem("theme") || "system";
  } catch {
    return "system";
  }
};

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStored);
  const [systemDark, setSystemDark] = useState(() => Boolean(media()?.matches));

  useEffect(() => {
    const m = media();
    if (!m) return;
    const onChange = (e) => setSystemDark(e.matches);
    m.addEventListener("change", onChange);
    return () => m.removeEventListener("change", onChange);
  }, []);

  const resolved = theme === "system" ? (systemDark ? "dark" : "light") : theme;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark");
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved === "dark" ? "#121212" : "#ffffff");
  }, [resolved]);

  const setTheme = (value) => {
    setThemeState(value);
    try {
      localStorage.setItem("theme", value);
    } catch {
      /* private mode */
    }
  };

  return <ThemeContext.Provider value={{ theme, resolved, setTheme }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

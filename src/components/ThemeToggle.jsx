// @ts-nocheck
import { useState } from "react";
import { Sun, Moon } from "lucide-react";
import { C } from "../lib/constants";
import { currentTheme, toggleTheme } from "../lib/theme";

export default function ThemeToggle() {
  const [theme, setThemeState] = useState(currentTheme());
  return (
    <button
      aria-label={theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
      onClick={() => setThemeState(toggleTheme())}
      style={{ background: "none", border: `1px solid ${C.border}`, color: C.subtle, borderRadius: 8, width: 28, height: 28, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
    >
      {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}

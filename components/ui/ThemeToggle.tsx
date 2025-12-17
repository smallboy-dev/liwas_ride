"use client";

import { useContext } from "react";
import { ThemeContext } from "@/context/ThemeContext";
import { SunIcon, MoonIcon } from "@/components/ui/icons";

/**
 * Theme Toggle Button Component
 * Allows users to switch between light and dark modes
 * Safely handles case where ThemeProvider is not available
 */
export function ThemeToggle() {
  const context = useContext(ThemeContext);

  // If ThemeProvider is not available, don't render
  if (!context) {
    return null;
  }

  const { theme, toggleTheme } = context;

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      title={`Current theme: ${theme}`}
    >
      {theme === "light" ? (
        <MoonIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      ) : (
        <SunIcon className="w-5 h-5 text-yellow-400" />
      )}
    </button>
  );
}

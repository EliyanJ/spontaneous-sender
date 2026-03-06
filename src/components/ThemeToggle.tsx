import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "relative flex items-center gap-1 rounded-full p-1 transition-all duration-300",
        "bg-muted border border-border",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
      aria-label="Toggle theme"
    >
      {/* Sliding indicator */}
      <span
        className={cn(
          "absolute top-1 h-6 w-7 rounded-full transition-all duration-300 shadow-sm",
          isDark
            ? "left-[calc(100%-1.875rem)] bg-slate-700"
            : "left-1 bg-yellow-400"
        )}
      />

      {/* Sun */}
      <span className={cn(
        "relative z-10 flex items-center justify-center w-7 h-6 transition-colors duration-300",
        !isDark ? "text-yellow-900" : "text-muted-foreground"
      )}>
        <Sun className="w-3.5 h-3.5" />
      </span>

      {/* Moon */}
      <span className={cn(
        "relative z-10 flex items-center justify-center w-7 h-6 transition-colors duration-300",
        isDark ? "text-blue-200" : "text-muted-foreground"
      )}>
        <Moon className="w-3.5 h-3.5" />
      </span>
    </button>
  );
};

import { useEffect, useState } from "react";
import logoDark from "@/assets/logo-dark.png";
import logoLight from "@/assets/logo-light.png";

interface LogoProps {
  className?: string;
  height?: number | string;
}

/**
 * Adaptive logo — reads the `dark` class on <html> directly.
 * Light mode (no .dark) → logo-light.png (logo blanc)
 * Dark mode (.dark)     → logo-dark.png  (logo noir)
 *
 * NOTE: The logic is "what looks good on the background":
 *   - Light bg  → show the DARK logo (logo-dark = black text, visible on white)
 *   - Dark bg   → show the LIGHT logo (logo-light = white text, visible on black)
 *
 * But per user spec:
 *   light mode → Logo_blanc.png  (stored as logo-light.png)
 *   dark mode  → Logo_noir.png   (stored as logo-dark.png)
 */
export const Logo = ({ className = "", height = 32 }: LogoProps) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Read initial state
    setIsDark(document.documentElement.classList.contains("dark"));

    // Watch for class changes on <html>
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // light mode → logo_blanc (logo-light), dark mode → logo_noir (logo-dark)
  const src = isDark ? logoDark : logoLight;

  return (
    <img
      src={src}
      alt="Cronos"
      className={className}
      style={{
        height: typeof height === "number" ? `${height}px` : height,
        width: "auto",
        objectFit: "contain",
        display: "block",
      }}
    />
  );
};

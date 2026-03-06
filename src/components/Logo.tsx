import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import logoDark from "@/assets/logo-dark.png";
import logoLight from "@/assets/logo-light.png";

interface LogoProps {
  className?: string;
  /** Override height (default: 32px) */
  height?: number | string;
}

/**
 * Adaptive logo: shows the dark logo in light mode, white logo in dark mode.
 * Uses a single source of truth — import this everywhere instead of raw <img> tags.
 */
export const Logo = ({ className = "", height = 32 }: LogoProps) => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — render only after client mount
  useEffect(() => setMounted(true), []);

  const src = !mounted || resolvedTheme === "dark" ? logoLight : logoDark;

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

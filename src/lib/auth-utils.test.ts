import { describe, it, expect } from "vitest";
import { vi } from "vitest";
import "@/test/mocks/supabase";
import { supabaseMock } from "@/test/mocks/supabase";

// Mock window.location
Object.defineProperty(window, "location", {
  writable: true,
  value: { hostname: "localhost", origin: "http://localhost:3000", href: "" },
});

// Mock lovable integration
vi.mock("@/integrations/lovable/index", () => ({
  lovable: {
    auth: {
      signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

import { signInWithGoogle } from "@/lib/auth-utils";

describe("signInWithGoogle", () => {
  it("utilise le bridge Lovable sur les domaines lovable.app", async () => {
    Object.defineProperty(window, "location", {
      writable: true,
      value: { hostname: "my-app.lovable.app", origin: "https://my-app.lovable.app", href: "" },
    });

    const { lovable } = await import("@/integrations/lovable/index");
    const result = await signInWithGoogle("/dashboard");
    expect(result.error).toBeNull();
    expect(lovable.auth.signInWithOAuth).toHaveBeenCalledWith("google", expect.any(Object));
  });

  it("utilise Supabase directement sur un domaine custom avec URL valide", async () => {
    Object.defineProperty(window, "location", {
      writable: true,
      value: { hostname: "mycustom.com", origin: "https://mycustom.com", href: "" },
    });

    supabaseMock.auth.signInWithOAuth = vi.fn().mockResolvedValue({
      data: { url: "https://accounts.google.com/oauth?client_id=test" },
      error: null,
    });

    // La redirection window.location.href va échouer dans jsdom — on la mock
    let redirected = "";
    Object.defineProperty(window, "location", {
      writable: true,
      value: {
        hostname: "mycustom.com",
        origin: "https://mycustom.com",
        set href(v: string) { redirected = v; },
        get href() { return redirected; },
      },
    });

    const result = await signInWithGoogle("/dashboard");
    expect(result.error).toBeNull();
    expect(supabaseMock.auth.signInWithOAuth).toHaveBeenCalled();
  });

  it("retourne une erreur si Supabase échoue", async () => {
    Object.defineProperty(window, "location", {
      writable: true,
      value: { hostname: "mycustom.com", origin: "https://mycustom.com", href: "" },
    });

    supabaseMock.auth.signInWithOAuth = vi.fn().mockResolvedValue({
      data: null,
      error: new Error("Auth error"),
    });

    const result = await signInWithGoogle();
    expect(result.error).toBeInstanceOf(Error);
  });

  it("rejette une URL OAuth vers un host non autorisé", async () => {
    Object.defineProperty(window, "location", {
      writable: true,
      value: { hostname: "mycustom.com", origin: "https://mycustom.com", href: "" },
    });

    supabaseMock.auth.signInWithOAuth = vi.fn().mockResolvedValue({
      data: { url: "https://malicious.com/oauth" },
      error: null,
    });

    const result = await signInWithGoogle();
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toContain("Invalid OAuth redirect URL");
  });
});

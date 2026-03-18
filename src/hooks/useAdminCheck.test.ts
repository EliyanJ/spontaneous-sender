import { describe, it, expect } from "vitest";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { renderHook, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { supabaseMock } from "@/test/mocks/supabase";

// Le mock supabase est chargé via le fichier de setup
import "@/test/mocks/supabase";

// Mock useAuth
vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@/hooks/useAuth";

describe("useAdminCheck", () => {
  it("retourne isAdmin=false et loading=false quand il n'y a pas d'utilisateur", async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: null,
      loading: false,
    });

    const { result } = renderHook(() => useAdminCheck());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAdmin).toBe(false);
  });

  it("retourne isAdmin=true quand le RPC has_role retourne true", async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: "admin-user-id" },
      loading: false,
    });

    supabaseMock.rpc = vi.fn().mockResolvedValue({ data: true, error: null });

    const { result } = renderHook(() => useAdminCheck());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAdmin).toBe(true);
  });

  it("retourne isAdmin=false quand le RPC has_role retourne false", async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: "regular-user-id" },
      loading: false,
    });

    supabaseMock.rpc = vi.fn().mockResolvedValue({ data: false, error: null });

    const { result } = renderHook(() => useAdminCheck());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAdmin).toBe(false);
  });

  it("retourne isAdmin=false en cas d'erreur RPC", async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: "user-id" },
      loading: false,
    });

    supabaseMock.rpc = vi.fn().mockResolvedValue({ data: null, error: new Error("RPC error") });

    const { result } = renderHook(() => useAdminCheck());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAdmin).toBe(false);
  });

  it("reste loading=true tant que authLoading est true", () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: null,
      loading: true,
    });

    const { result } = renderHook(() => useAdminCheck());
    expect(result.current.loading).toBe(true);
  });
});

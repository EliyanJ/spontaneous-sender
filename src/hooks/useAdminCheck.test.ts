import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { supabaseMock } from "@/test/mocks/supabase";
import "@/test/mocks/supabase";

vi.mock("@/hooks/useAuth", () => ({ useAuth: vi.fn() }));
import { useAuth } from "@/hooks/useAuth";

describe("useAdminCheck", () => {
  it("retourne isAdmin=false quand pas d'utilisateur", async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: null, loading: false });
    const { useAdminCheck } = await import("@/hooks/useAdminCheck");
    const { result } = renderHook(() => useAdminCheck());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAdmin).toBe(false);
  });

  it("retourne isAdmin=true quand RPC retourne true", async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: { id: "00000000-0000-0000-0000-000000000001" }, loading: false });
    supabaseMock.rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    const { useAdminCheck } = await import("@/hooks/useAdminCheck");
    const { result } = renderHook(() => useAdminCheck());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAdmin).toBe(true);
  });

  it("retourne isAdmin=false quand RPC retourne false", async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: { id: "00000000-0000-0000-0000-000000000002" }, loading: false });
    supabaseMock.rpc = vi.fn().mockResolvedValue({ data: false, error: null });
    const { useAdminCheck } = await import("@/hooks/useAdminCheck");
    const { result } = renderHook(() => useAdminCheck());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAdmin).toBe(false);
  });

  it("retourne isAdmin=false en cas d'erreur RPC", async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: { id: "00000000-0000-0000-0000-000000000003" }, loading: false });
    supabaseMock.rpc = vi.fn().mockResolvedValue({ data: null, error: new Error("RPC error") });
    const { useAdminCheck } = await import("@/hooks/useAdminCheck");
    const { result } = renderHook(() => useAdminCheck());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAdmin).toBe(false);
  });

  it("reste loading=true tant que authLoading est true", async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: null, loading: true });
    const { useAdminCheck } = await import("@/hooks/useAdminCheck");
    const { result } = renderHook(() => useAdminCheck());
    expect(result.current.loading).toBe(true);
  });
});

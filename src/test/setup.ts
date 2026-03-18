// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference types="@testing-library/jest-dom" />
import "@testing-library/jest-dom/vitest";

// Mock matchMedia (jsdom doesn't support it)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock ResizeObserver
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock structuredClone if not available
if (typeof structuredClone === "undefined") {
  (global as unknown as Record<string, unknown>).structuredClone = <T>(val: T): T => JSON.parse(JSON.stringify(val));
}

import "@testing-library/jest-dom";

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
  global.structuredClone = <T>(val: T): T => JSON.parse(JSON.stringify(val));
}

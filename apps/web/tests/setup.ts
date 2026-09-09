import "@testing-library/jest-dom/vitest";

// --- jsdom gaps needed by Radix (shadcn) + sonner + ThemeProvider ---

if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

const w = window as unknown as Record<string, unknown>;
w.ResizeObserver ??= class {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
};

const proto = Element.prototype as unknown as Record<string, unknown>;
proto.scrollIntoView ??= (): void => {};
proto.hasPointerCapture ??= (): boolean => false;
proto.setPointerCapture ??= (): void => {};
proto.releasePointerCapture ??= (): void => {};

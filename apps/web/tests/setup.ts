import "@testing-library/jest-dom/vitest";

// Align AbortSignal and Request between Node 24 and JSDOM
if (typeof globalThis.Request !== "undefined") {
  const OriginalRequest = globalThis.Request;
  (globalThis as any).Request = class extends OriginalRequest {
    constructor(input: any, init?: any) {
      if (init && "signal" in init) {
        const { signal, ...rest } = init;
        super(input, rest);
        return;
      }
      super(input, init);
    }
  };
  (window as any).Request = (globalThis as any).Request;
}

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

// Recharts ResponsiveContainer needs a measurable parent in jsdom.
Element.prototype.getBoundingClientRect = function (): DOMRect {
  return {
    width: 640,
    height: 320,
    top: 0,
    left: 0,
    right: 640,
    bottom: 320,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect;
};

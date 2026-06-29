import { describe, it, expect } from "vitest";
import { paletteProfileFromPrompt } from "../paletteProfile";

describe("paletteProfileFromPrompt", () => {
  it("maps calm prompts", () => {
    expect(paletteProfileFromPrompt("peaceful ocean")).toBe("peaceful");
    expect(paletteProfileFromPrompt("serene blue field")).toBe("serene");
  });

  it("maps dark prompts", () => {
    expect(paletteProfileFromPrompt("void fractal")).toBe("void");
    expect(paletteProfileFromPrompt("deep shadow tunnel")).toBe("shadow");
  });

  it("maps intense prompts", () => {
    expect(paletteProfileFromPrompt("angry energy")).toBe("angry");
    expect(paletteProfileFromPrompt("ominous portal")).toBe("ominous");
  });

  it("defaults to quantum when no emotion keyword is present", () => {
    expect(paletteProfileFromPrompt("mandelbrot julia wormhole")).toBe("quantum");
  });
});


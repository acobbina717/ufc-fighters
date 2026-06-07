import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const cardCss = readFileSync(
  new URL("./WeightClassCard.module.css", import.meta.url),
  "utf8",
);

const frameCss = readFileSync(
  new URL("./WeightClassFrame.module.css", import.meta.url),
  "utf8",
);

const mobileCss = cardCss.slice(cardCss.indexOf("@media (max-width: 48em)"));
const frameMobileCss = frameCss.slice(frameCss.indexOf("@media (max-width: 48em)"));

describe("Weight Class Card mobile contract", () => {
  it("removes clipped card geometry from mobile card surfaces and the tap layer", () => {
    expect(mobileCss).toContain("clip-path: none !important;");
    expect(mobileCss).toContain(".linkLayer");
    expect(mobileCss).toContain(".imageWrapper");
    expect(mobileCss).toContain(".card > svg");
    expect(mobileCss).toContain("display: none;");
  });

  it("removes the desktop structural frame on mobile", () => {
    expect(frameMobileCss).toContain(".root");
    expect(frameMobileCss).toContain("display: none;");
  });

  it("uses full-width portrait-friendly rounded cards on mobile", () => {
    expect(mobileCss).toContain("width: 100%;");
    expect(mobileCss).toContain("aspect-ratio: 4 / 3;");
    expect(mobileCss).toContain("border-radius: 8px;");
    expect(mobileCss).toContain("overflow: hidden;");
  });

  it("keeps mobile taps full-card without red hover overlay artifacts", () => {
    expect(mobileCss).toContain("inset: 0;");
    expect(mobileCss).toContain("height: 100%;");
    expect(cardCss).toContain(".overlay");
    expect(cardCss).toContain("display: none;");
    expect(mobileCss).not.toContain("210, 10, 10");
  });
});

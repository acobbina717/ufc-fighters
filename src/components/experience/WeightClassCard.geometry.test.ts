import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  WEIGHT_CLASS_CARD_OUTLINE_PATHS,
  WEIGHT_CLASS_CARD_PATHS,
} from "./WeightClassCard";

const cardCss = readFileSync(
  new URL("./WeightClassCard.module.css", import.meta.url),
  "utf8",
);

const frameCss = readFileSync(
  new URL("./WeightClassFrame.module.css", import.meta.url),
  "utf8",
);

const gridCss = readFileSync(
  new URL("./WeightClassGrid.module.css", import.meta.url),
  "utf8",
);

describe("Weight Class Card geometry", () => {
  it("keeps desktop cards and the structural frame in the same 4:3 ratio", () => {
    expect(cardCss).toContain("aspect-ratio: 4 / 3;");
    expect(frameCss).toContain("* (3 / 4)");
    expect(frameCss).toContain("margin-bottom: 0;");
    expect(gridCss).toContain("row-gap: 0;");
    expect(gridCss).toContain("padding-bottom: 0;");
    expect(frameCss).toContain("z-index: 1;");
    expect(gridCss).toContain("--curve-r: clamp(56px, 9.375cqw, 120px);");
  });

  it("uses shared objectBoundingBox paths with 4:3 circular arc geometry", () => {
    expect(WEIGHT_CLASS_CARD_PATHS).toEqual({
      left: "M 0,0 L 1,0 L 1,0.75 A 0.1875,0.25 0 0 1 0.8125,1 L 0,1 Z",
      right:
        "M 0,0 L 1,0 L 1,1 L 0.1875,1 A 0.1875,0.25 0 0 1 0,0.75 L 0,0 Z",
    });
  });

  it("uses full outline paths so the visible border sits on the clip-path edge", () => {
    expect(WEIGHT_CLASS_CARD_OUTLINE_PATHS).toEqual({
      left: "M 0,0 L 100,0 L 100,75 A 18.75,25 0 0 1 81.25,100 L 0,100 Z",
      right:
        "M 0,0 L 100,0 L 100,100 L 18.75,100 A 18.75,25 0 0 1 0,75 L 0,0 Z",
    });
    expect(cardCss).toContain(".outlinePath");
    expect(cardCss).toContain("stroke: var(--frame-color);");
    expect(cardCss).toContain("stroke-width: 8;");
  });

  it("does not apply a gray image wash over champion photos", () => {
    expect(cardCss).toContain("opacity: 1;");
    expect(cardCss).toContain("filter: none;");
    expect(cardCss).toContain("display: none;");
    expect(cardCss).not.toContain("grayscale");
  });
});

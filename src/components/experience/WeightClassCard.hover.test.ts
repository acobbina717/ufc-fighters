import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const cardSource = readFileSync(
  new URL("./WeightClassCard.tsx", import.meta.url),
  "utf8",
);

const cardCss = readFileSync(
  new URL("./WeightClassCard.module.css", import.meta.url),
  "utf8",
);

describe("Weight Class Card hover treatment", () => {
  it("renders a visible SVG stroke from the shared card path", () => {
    expect(cardSource).toContain('d={WEIGHT_CLASS_CARD_PATHS[variant]}');
    expect(cardSource).toContain("className={classes.borderPath}");
  });

  it("uses one CSS custom property for the border gradient colors", () => {
    expect(cardCss).toContain(
      "--border-gradient-stops: white, rgba(255, 255, 255, 0.15), white;",
    );
    expect(cardSource).toContain('getPropertyValue("--border-gradient-stops")');
  });

  it("includes a sheen layer and removes the red hover overlay", () => {
    expect(cardSource).toContain("className={classes.sheen}");
    expect(cardSource).toContain('(max-width: 48em), (hover: none)');
    expect(cardCss).toContain("@media (hover: hover)");
    expect(cardCss).not.toContain("210, 10, 10");
  });
});

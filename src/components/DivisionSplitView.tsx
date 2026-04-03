import { useRef } from "react";
import { useMantineTheme } from "@mantine/core";
import { gsap, useGSAP } from "#/lib/gsap";
import DivisionPanel from "./DivisionPanel";
import classes from "./DivisionSplitView.module.css";

export default function DivisionSplitView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);
  const theme = useMantineTheme();

  useGSAP(
    () => {
      if (!leftRef.current || !rightRef.current || !dividerRef.current) return;

      const mm = gsap.matchMedia();

      mm.add(
        `(prefers-reduced-motion: no-preference) and (min-width: ${theme.breakpoints.sm})`,
        () => {
          const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
          tl.from(leftRef.current!, { x: -80, opacity: 0, duration: 1.1 })
            .from(rightRef.current!, { x: 80, opacity: 0, duration: 1.1 }, "<")
            .from(
              dividerRef.current!,
              {
                opacity: 0,
                scaleY: 0,
                duration: 0.7,
                ease: "power2.out",
                transformOrigin: "top center",
              },
              "-=0.5",
            );
        },
      );

      mm.add(
        `(prefers-reduced-motion: no-preference) and (max-width: calc(${theme.breakpoints.sm} - 0.02em))`,
        () => {
          gsap.from([leftRef.current!, rightRef.current!], {
            opacity: 0,
            y: 40,
            stagger: 0.15,
            duration: 0.9,
            ease: "power3.out",
          });
        },
      );
    },
    { scope: containerRef },
  );

  function expandLeft() {
    if (!leftRef.current || !rightRef.current) return;
    gsap.to(leftRef.current, {
      flex: "1.32",
      duration: 0.65,
      ease: "power3.out",
      overwrite: "auto",
    });
    gsap.to(rightRef.current, {
      flex: "0.68",
      duration: 0.65,
      ease: "power3.out",
      overwrite: "auto",
    });
  }

  function expandRight() {
    if (!leftRef.current || !rightRef.current) return;
    gsap.to(leftRef.current, {
      flex: "0.68",
      duration: 0.65,
      ease: "power3.out",
      overwrite: "auto",
    });
    gsap.to(rightRef.current, {
      flex: "1.32",
      duration: 0.65,
      ease: "power3.out",
      overwrite: "auto",
    });
  }

  function resetSplit() {
    if (!leftRef.current || !rightRef.current) return;
    gsap.to([leftRef.current, rightRef.current], {
      flex: "1",
      duration: 0.55,
      ease: "power2.inOut",
      overwrite: "auto",
    });
  }

  return (
    <div ref={containerRef} className={classes.split}>
      <div
        ref={leftRef}
        className={classes.side}
        onMouseEnter={expandLeft}
        onMouseLeave={resetSplit}
      >
        <DivisionPanel gender="mens" defaultDivision="mens-lightweight" />
      </div>

      <div ref={dividerRef} className={classes.divider} aria-hidden="true" />

      <div
        ref={rightRef}
        className={classes.side}
        onMouseEnter={expandRight}
        onMouseLeave={resetSplit}
      >
        <DivisionPanel gender="womens" defaultDivision="womens-bantamweight" />
      </div>
    </div>
  );
}

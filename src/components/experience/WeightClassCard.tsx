import { useId, useRef } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import type { Gender } from "#/lib/weightClasses";
import classes from "./WeightClassCard.module.css";
import { gsap, useGSAP } from "#/lib/gsap";

interface WeightClassCardProps {
  weightClass: string;
  weightClassSlug: string;
  gender: Gender;
  variant: "left" | "right";
  championImageUrl?: string;
}

// ClipPath paths (0-1 objectBoundingBox) mirror the border's circular arc.
// For 4:3 cards, R=25% of height maps to 18.75% of width.
export const WEIGHT_CLASS_CARD_PATHS = {
  left: "M 0,0 L 1,0 L 1,0.75 A 0.1875,0.25 0 0 1 0.8125,1 L 0,1 Z",
  right:
    "M 0,0 L 1,0 L 1,1 L 0.1875,1 A 0.1875,0.25 0 0 1 0,0.75 L 0,0 Z",
};

export const WEIGHT_CLASS_CARD_OUTLINE_PATHS = {
  left: "M 0,0 L 100,0 L 100,75 A 18.75,25 0 0 1 81.25,100 L 0,100 Z",
  right:
    "M 0,0 L 100,0 L 100,100 L 18.75,100 A 18.75,25 0 0 1 0,75 L 0,0 Z",
};

export function parseBorderGradientStops(value: string): [string, string, string] {
  const stops = value
    .split(/,(?![^()]*\))/)
    .map((stop) => stop.trim())
    .filter(Boolean);

  return [
    stops[0] ?? "white",
    stops[1] ?? "rgba(255, 255, 255, 0.15)",
    stops[2] ?? stops[0] ?? "white",
  ];
}

export default function WeightClassCard({
  weightClass,
  weightClassSlug,
  gender,
  variant,
  championImageUrl,
}: WeightClassCardProps) {
  const cardRef = useRef<HTMLElement>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const borderPathRef = useRef<SVGPathElement>(null);
  const borderGradientRef = useRef<SVGLinearGradientElement>(null);
  const borderStopRefs = useRef<Array<SVGStopElement | null>>([]);
  const sheenRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const clipId = useId();
  const gradientId = `${clipId}-border-gradient`;

  const { contextSafe } = useGSAP({ scope: cardRef });

  const handleHoverEnter = contextSafe(() => {
    if (window.matchMedia("(max-width: 48em), (hover: none)").matches) return;

    const card = cardRef.current;
    const borderPath = borderPathRef.current;
    const borderGradient = borderGradientRef.current;
    const sheen = sheenRef.current;
    if (!card || !borderPath || !borderGradient || !sheen) return;

    const [start, middle, end] = parseBorderGradientStops(
      getComputedStyle(card).getPropertyValue("--border-gradient-stops"),
    );

    borderStopRefs.current[0]?.setAttribute("stop-color", start);
    borderStopRefs.current[1]?.setAttribute("stop-color", middle);
    borderStopRefs.current[2]?.setAttribute("stop-color", end);

    gsap.killTweensOf([borderPath, borderGradient, sheen]);

    gsap.set(borderPath, {
      opacity: 1,
      strokeDashoffset: 1,
    });

    gsap.to(borderPath, {
      strokeDashoffset: 0,
      duration: 0.9,
      ease: "power3.out",
    });

    gsap.fromTo(
      borderGradient,
      { attr: { gradientTransform: "rotate(0 .5 .5)" } },
      {
        attr: { gradientTransform: "rotate(360 .5 .5)" },
        duration: 2.8,
        ease: "none",
        repeat: -1,
      },
    );

    gsap.fromTo(
      sheen,
      { autoAlpha: 0, xPercent: -140 },
      {
        autoAlpha: 1,
        xPercent: 140,
        duration: 1.15,
        ease: "power2.out",
        onComplete: () => {
          gsap.set(sheen, { autoAlpha: 0 });
        },
      },
    );
  });

  const handleHoverLeave = contextSafe(() => {
    const borderPath = borderPathRef.current;
    const borderGradient = borderGradientRef.current;
    const sheen = sheenRef.current;
    if (!borderPath || !borderGradient || !sheen) return;

    gsap.killTweensOf([borderPath, borderGradient, sheen]);
    gsap.to(borderPath, {
      opacity: 0,
      duration: 0.35,
      ease: "power2.out",
    });
    gsap.set(sheen, { autoAlpha: 0, xPercent: -140 });
  });

  const handleClick = contextSafe((e: React.MouseEvent) => {
    e.preventDefault();

    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const clone = card.cloneNode(true) as HTMLElement;
    document.body.appendChild(clone);

    gsap.set(clone, {
      position: "fixed",
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      margin: 0,
      zIndex: 9999,
      clipPath: "none",
    });

    gsap.set(card, { opacity: 0 });

    gsap.to(clone, {
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      duration: 0.6,
      ease: "power3.inOut",
      onComplete: () => {
        navigate({
          to: "/divisions/$gender/$weightClass",
          params: { gender, weightClass: weightClassSlug },
        }).then(() => {
          clone.remove();
          gsap.set(card, { opacity: 1 });
        });
      },
    });
  });

  return (
    <article
      ref={cardRef}
      className={`${classes.card} ${variant === "left" ? classes.cardLeft : classes.cardRight}`}
    >
      <svg
        className={classes.borderSvg}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <clipPath id={clipId} clipPathUnits="objectBoundingBox">
            <path d={WEIGHT_CLASS_CARD_PATHS[variant]} />
          </clipPath>
          <linearGradient
            ref={borderGradientRef}
            id={gradientId}
            x1="0"
            y1="0"
            x2="1"
            y2="1"
            gradientTransform="rotate(0 .5 .5)"
          >
            <stop
              ref={(node) => {
                borderStopRefs.current[0] = node;
              }}
              offset="0%"
              stopColor="white"
            />
            <stop
              ref={(node) => {
                borderStopRefs.current[1] = node;
              }}
              offset="50%"
              stopColor="rgba(255, 255, 255, 0.15)"
            />
            <stop
              ref={(node) => {
                borderStopRefs.current[2] = node;
              }}
              offset="100%"
              stopColor="white"
            />
          </linearGradient>
        </defs>
        <path
          d={WEIGHT_CLASS_CARD_OUTLINE_PATHS[variant]}
          className={classes.outlinePath}
          vectorEffect="non-scaling-stroke"
        />
        <path
          ref={borderPathRef}
          d={WEIGHT_CLASS_CARD_OUTLINE_PATHS[variant]}
          className={classes.borderPath}
          pathLength={1}
          stroke={`url(#${gradientId})`}
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div
        className={classes.imageWrapper}
        style={{ clipPath: `url(#${clipId})` }}
      >
        {championImageUrl ? (
          <img src={championImageUrl} alt="" className={classes.image} />
        ) : (
          <div className={classes.image} style={{ background: "#222" }} />
        )}
        <div className={classes.overlay} />
        <div ref={sheenRef} className={classes.sheen} />
      </div>

      <div className={classes.content}>
        <h3 className={classes.title}>{weightClass}</h3>
      </div>

      <Link
        ref={linkRef}
        to="/divisions/$gender/$weightClass"
        params={{ gender, weightClass: weightClassSlug }}
        className={classes.linkLayer}
        style={{ clipPath: `url(#${clipId})` }}
        aria-label={`${gender === "mens" ? "Men's" : "Women's"} ${weightClass} Division`}
        onClick={handleClick}
        onMouseEnter={handleHoverEnter}
        onMouseLeave={handleHoverLeave}
      />
    </article>
  );
}

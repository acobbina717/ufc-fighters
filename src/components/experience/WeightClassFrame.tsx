import { type Gender } from "#/lib/weightClasses";
import classes from "./WeightClassFrame.module.css";

interface WeightClassFrameProps {
  gender: Gender;
  count: number;
}

/**
 * Structural Skeleton Frame
 * Renders the 8px vertical spine and the 8px circular "sprouts" as a single
 * unified structural component. This decouples the frame from the content cards.
 */
export default function WeightClassFrame({ count }: WeightClassFrameProps) {
  // Array of row indices to draw sprouts for each card
  // We assume a 2-column grid layout
  const rowCount = Math.ceil(count / 2);
  const rows = Array.from({ length: rowCount }, (_, i) => i);

  return (
    <div className={classes.root} aria-hidden="true">
      {/* Central Backbone */}
      <div className={classes.spine} />

      {/* Individual Sprouts for each row */}
      {rows.map((row) => (
        <div key={row} className={classes.rowFrame}>
          {/* Left Sprout */}
          <div className={`${classes.sprout} ${classes.sproutLeft}`}>
            <svg viewBox="0 0 100 100" className={classes.arcSvg}>
              <path
                d="M 100,0 A 100,100 0 0 1 0,100"
                fill="none"
                stroke="var(--frame-color)"
                strokeWidth="8"
              />
            </svg>
            <div className={classes.bottomBar} />
          </div>

          {/* Right Sprout (if card exists in this column) */}
          {(row * 2 + 1 < count) && (
            <div className={`${classes.sprout} ${classes.sproutRight}`}>
              <svg viewBox="0 0 100 100" className={classes.arcSvg}>
                <path
                  d="M 0,0 A 100,100 0 0 0 100,100"
                  fill="none"
                  stroke="var(--frame-color)"
                  strokeWidth="8"
                />
              </svg>
              <div className={classes.bottomBar} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

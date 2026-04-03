// Single fighter beat. Stacked absolutely — GSAP controls opacity/x per beat.
// photoSide flips layout: right for men's, left for women's.
// Stat rings use CSS conic-gradient (not SVG) — GPU-compositable, zero CPU cost during scrub.
import { forwardRef } from "react";
import { Badge } from "@mantine/core";
import type { Doc } from "../../../convex/_generated/dataModel";
import classes from "./FighterSpotlight.module.css";

interface Props {
  fighter: Doc<"fighters">;
  isChampion: boolean;
  rank: number;
  photoSide: "left" | "right";
}

const STAT_MAX = { slpm: 12, strikingAccuracy: 100, takedownAvg: 10, submissionAvg: 5 };

function StatRing({ label, value, max, subLabel, pctSuffix = "" }: {
  label: string; value: number; max: number; subLabel: string; pctSuffix?: string;
}) {
  const pct = Math.min(100, (value / max) * 100);
  const display = value % 1 === 0 ? String(value) : value.toFixed(1);

  return (
    <div className={classes.statItem}>
      <div className={classes.statRingWrapper}>
        <div
          className={classes.statRing}
          style={{ '--ring-pct': `${pct}%` } as React.CSSProperties}
        />
        <span className={classes.statRingValue}>{display}{pctSuffix}</span>
      </div>
      <div className={classes.statLabels}>
        <span className={classes.statLabel}>{label}</span>
        <span className={classes.statSubLabel}>{subLabel}</span>
      </div>
    </div>
  );
}

const FighterSpotlight = forwardRef<HTMLDivElement, Props>(
  ({ fighter, isChampion, rank, photoSide }, ref) => {
    const { record } = fighter;

    return (
      <div ref={ref} className={classes.root}>
        {/* Photo */}
        {fighter.photoUrl && (
          <div
            className={`${classes.photo} ${photoSide === "right" ? classes.photoRight : classes.photoLeft}`}
          >
            <img
              src={fighter.photoUrl}
              alt={fighter.name}
              className={classes.photoImg}
            />
            <div
              className={
                photoSide === "right"
                  ? classes.photoGradientRight
                  : classes.photoGradientLeft
              }
            />
          </div>
        )}

        {/* Content */}
        <div
          className={`${classes.content} ${photoSide === "left" ? classes.contentRight : ""}`}
        >
          <Badge
            color={isChampion ? "ufcRed" : "dark"}
            variant={isChampion ? "filled" : "light"}
            size="sm"
            radius="xs"
            tt="uppercase"
            classNames={{ root: classes.badge }}
          >
            {isChampion ? "Champion" : `#${rank}`}
          </Badge>
          <h2 className={classes.name}>{fighter.name}</h2>
          {fighter.weight && (
            <p className={classes.fighterWeight}>{fighter.weight}</p>
          )}
          {fighter.country && (
            <p className={classes.country}>{fighter.country}</p>
          )}
          <p className={classes.record}>
            {record.wins}W · {record.losses}L
            {record.draws > 0 ? ` · ${record.draws}D` : ""}
          </p>

          <div className={classes.statsGrid}>
            <StatRing label="Striking Output" subLabel="SLpM" value={fighter.stats.slpm} max={STAT_MAX.slpm} />
            <StatRing label="Striking Acc." subLabel="Accuracy" value={fighter.stats.strikingAccuracy} max={STAT_MAX.strikingAccuracy} pctSuffix="%" />
            <StatRing label="Takedown Avg." subLabel="TD / 15 min" value={fighter.stats.takedownAvg} max={STAT_MAX.takedownAvg} />
            <StatRing label="Submission Avg." subLabel="Sub / 15 min" value={fighter.stats.submissionAvg} max={STAT_MAX.submissionAvg} />
          </div>
        </div>
      </div>
    );
  },
);

FighterSpotlight.displayName = "FighterSpotlight";
export default FighterSpotlight;

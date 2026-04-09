import { useState, useRef, useEffect } from "react";
import { api } from "../../convex/_generated/api";
import { useStableQuery } from "#/hooks/useStableQuery";
import { gsap, useGSAP, SplitText } from "#/lib/gsap";
import { MENS_DIVISIONS, WOMENS_DIVISIONS } from "#/lib/weightClasses";
import { Badge, ScrollArea, UnstyledButton } from "@mantine/core";
import type { Doc } from "../../convex/_generated/dataModel";
import { useStaleSync } from "#/hooks/useStaleSync";
import classes from "./DivisionPanel.module.css";

interface DivisionPanelProps {
  gender: "mens" | "womens";
  defaultDivision: string;
}

export default function DivisionPanel({
  gender,
  defaultDivision,
}: DivisionPanelProps) {
  const divisions = gender === "womens" ? WOMENS_DIVISIONS : MENS_DIVISIONS;
  const [activeDivision, setActiveDivision] = useState(defaultDivision);
  const weightClass = activeDivision.replace(/^(mens|womens)-/, "");

  const fighters = useStableQuery(api.fighters.getByWeightClass, {
    weightClass,
    division: gender,
  });

  useStaleSync(fighters, activeDivision);

  const [selectedFighter, setSelectedFighter] =
    useState<Doc<"fighters"> | null>(null);

  useEffect(() => {
    setSelectedFighter(null);
  }, [activeDivision]);

  const champion = fighters?.[0];
  const displayFighter = selectedFighter ?? champion;

  const panelRef = useRef<HTMLDivElement>(null);
  const heroNameRef = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      if (!champion || !heroNameRef.current) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        if (!heroNameRef.current) return;

        const split = SplitText.create(heroNameRef.current, {
          type: "chars",
          charsClass: "char",
          mask: "chars",
        });

        if (!split.chars.length) return;

        const rows = gsap.utils.toArray<HTMLElement>(
          `.${classes.contenderRow}`,
        );

        const tl = gsap.timeline();

        tl.from(split.chars, {
          yPercent: 110,
          stagger: { each: 0.025 },
          duration: 0.7,
          ease: "power3.out",
          onComplete: () => {
            gsap.set(split.chars, { clearProps: "all" });
          },
        });

        if (rows.length > 0) {
          tl.from(
            rows,
            {
              opacity: 0,
              x: gender === "womens" ? 16 : -16,
              stagger: 0.035,
              duration: 0.4,
              ease: "power2.out",
              clearProps: "all",
            },
            "-=0.3",
          );
        }
      });
    },
    { scope: panelRef, dependencies: [activeDivision, champion?.name] },
  );

  function getRankingLabel(ranking: number | undefined) {
    if (ranking === 0) return "Champion";
    if (ranking !== undefined) return `#${ranking}`;
    return "Unranked";
  }

  const divisionLabel =
    divisions.find((d) => d.key === activeDivision)?.shortLabel ?? "";

  return (
    <div ref={panelRef} className={classes.panel} data-gender={gender}>
      <div className={classes.contentColumn}>
        <div className={classes.top}>
          <div className={`${classes.sectionLabel} ${classes.wideSpacing}`}>
            {gender === "womens" ? "Women's" : "Men's"}
          </div>
          <div className={classes.pillGroup}>
            {divisions.map((d) => (
              <UnstyledButton
                key={d.key}
                className={classes.pill}
                data-active={d.key === activeDivision}
                onClick={() => setActiveDivision(d.key)}
                aria-label={`View ${d.label}`}
                aria-pressed={d.key === activeDivision}
              >
                {d.shortLabel}
              </UnstyledButton>
            ))}
          </div>
        </div>

        <div className={classes.hero}>
          {displayFighter ? (
            <div className={classes.heroInfo}>
              <Badge
                color="ufcRed"
                variant="filled"
                size="sm"
                radius="xs"
                className={classes.champBadge}
              >
                {getRankingLabel(displayFighter.ranking)}
              </Badge>

              <h2 ref={heroNameRef} className={classes.champName}>
                {displayFighter.name}
              </h2>

              {displayFighter.nickname && (
                <div className={classes.nickname}>
                  "{displayFighter.nickname}"
                </div>
              )}

              <div className={classes.recordGroup}>
                <span className={`${classes.recordWins} ${classes.statSpacing}`}>
                  {displayFighter.record.wins}W
                </span>
                <span className={classes.recordDot}>·</span>
                <span className={`${classes.recordLosses} ${classes.statSpacing}`}>
                  {displayFighter.record.losses}L
                </span>
                {displayFighter.record.draws > 0 && (
                  <>
                    <span className={classes.recordDot}>·</span>
                    <span className={classes.recordDraws}>
                      {displayFighter.record.draws}D
                    </span>
                  </>
                )}
              </div>

              {displayFighter.country && (
                <div className={`${classes.country} ${classes.statSpacing}`}>
                  {displayFighter.country}
                </div>
              )}
            </div>
          ) : (
            <div className={classes.loadingGroup}>
              <div className={classes.loadingDot} />
              <div className={classes.loadingDot} />
              <div className={classes.loadingDot} />
            </div>
          )}
        </div>

        <div className={classes.contendersWrapper}>
          <div className={classes.contendersHeader}>
            <div className={`${classes.sectionLabel} ${classes.wideSpacing}`}>
              Rankings
            </div>
            <Badge
              color="ufcRed"
              variant="light"
              size="xs"
              radius="xs"
              className={classes.ctaSpacing}
            >
              {divisionLabel}
            </Badge>
          </div>

          <ScrollArea scrollbarSize={3} className={classes.contendersList}>
            {(fighters ?? []).map((fighter) => {
              const isActive = fighter._id === displayFighter?._id;
              return (
                <UnstyledButton
                  key={fighter._id}
                  className={classes.contenderRow}
                  data-active={isActive}
                  onClick={() => setSelectedFighter(fighter)}
                  aria-label={`View ${fighter.name} details`}
                  aria-pressed={isActive}
                >
                  <div className={classes.contenderRowInner}>
                    <span className={classes.rankNum}>
                      {fighter.ranking === 0 ? "C" : `#${fighter.ranking}`}
                    </span>
                    <span className={classes.fighterName}>
                      {fighter.name}
                    </span>
                    <span className={classes.recordText}>
                      {fighter.record.wins}-{fighter.record.losses}
                    </span>
                    {fighter.country && (
                      <span className={classes.countryText}>
                        {fighter.country}
                      </span>
                    )}
                  </div>
                </UnstyledButton>
              );
            })}
          </ScrollArea>
        </div>
      </div>

      <div className={classes.photoColumn}>
        {displayFighter?.photoUrl && (
          <img
            src={displayFighter.photoUrl}
            alt={displayFighter.name}
            className={classes.fighterPhoto}
          />
        )}
        <div className={classes.photoFade} aria-hidden="true" />
        <div className={classes.photoFadeBottom} aria-hidden="true" />
      </div>
    </div>
  );
}

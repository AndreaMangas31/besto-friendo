import { OrbEyes } from "@/features/conversation/components/orbs/OrbEyes";
import type { OrbActivity } from "@/features/conversation/types/orb";
import type { OrbCaption, OrbVariant } from "@/features/conversation/components/orbs/variant";
import "./play-orb.css";

function PlayStationMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 72 32" className={className} fill="currentColor" aria-hidden>
      <path d="M6 3h16c8 0 13 4 13 10.2 0 6.3-5 10.3-13 10.3H14V29H6V3zm8 6.4v7.6h7.2c3.4 0 5.4-1.6 5.4-3.8 0-2.2-2-3.8-5.4-3.8H14z" />
      <path d="M42 9.2C42 4.4 46.6 2 54 2c5.2 0 10 1.5 14 4.2v8.2c-3.6-2.6-7.6-4-12.4-4-2.6 0-4 .8-4 2.2 0 3.2 17.6 1.4 17.6 11.4 0 6.2-6 9.8-16.2 9.8-6.4 0-12.4-2.2-16.4-5.2v-8.4c4 2.8 9 5 15.4 5 3.4 0 5.6-1 5.6-2.8 0-3.4-17.6-1.6-17.6-13.4z" />
    </svg>
  );
}

function Scene({ activity }: { activity: OrbActivity }) {
  return (
    <>
      <span className="tutor-orb-ps-btn tutor-orb-ps-btn--triangle">△</span>
      <span className="tutor-orb-ps-btn tutor-orb-ps-btn--circle">○</span>
      <span className="tutor-orb-ps-btn tutor-orb-ps-btn--cross">✕</span>
      <span className="tutor-orb-ps-btn tutor-orb-ps-btn--square">□</span>
      <div className="tutor-orb tutor-orb--play" data-activity={activity}>
        <span className="tutor-orb-astro-visor" />
        <OrbEyes variant="play" activity={activity} />
      </div>
    </>
  );
}

function caption(activity: OrbActivity): OrbCaption {
  const icon = <PlayStationMark className="h-4 w-8 text-sky-300" />;
  if (activity === "listening") {
    return { title: "PLAY MODE", subtitle: "Astro te oye.", icon };
  }
  if (activity === "thinking") {
    return { title: "PLAY MODE", subtitle: "Calculando el combo…", icon };
  }
  if (activity === "confused") {
    return { title: "PLAY MODE", subtitle: "Ehhh??? Combo ilegal.", icon };
  }
  if (activity === "oops") {
    return { title: "PLAY MODE", subtitle: "OOPS. ¡Ey!", icon };
  }
  return {
    title: "PLAY MODE",
    subtitle: "Astro listo. A jugar.",
    icon,
  };
}

export const playOrb: OrbVariant = { Scene, caption };

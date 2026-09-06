import type { OrbActivity } from "@/features/conversation/types/orb";
import type { OrbCaption, OrbVariant } from "@/features/conversation/components/orbs/variant";
import "./tv-orb.css";

function TvIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-orange-400" fill="none" aria-hidden>
      <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 20h8M12 6V3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function Scene({ activity }: { activity: OrbActivity }) {
  return (
    <>
      <span className="tutor-orb-tv-halo" />
      <span className="tutor-orb-tv-tread tutor-orb-tv-tread--left" />
      <span className="tutor-orb-tv-tread tutor-orb-tv-tread--right" />
      <span className="tutor-orb-tv-neck" />
      <span className="tutor-orb-tv-plant" aria-hidden>
        <span className="tutor-orb-tv-boot" />
        <span className="tutor-orb-tv-leaf" />
      </span>
      <div className="tutor-orb tutor-orb--tv" data-activity={activity}>
        <span className="tutor-orb-tv-stripe tutor-orb-tv-stripe--left" />
        <span className="tutor-orb-tv-stripe tutor-orb-tv-stripe--right" />
        <span className="tutor-orb-tv-goggle tutor-orb-tv-goggle--left">
          <span className="tutor-orb-tv-pupil" />
        </span>
        <span className="tutor-orb-tv-goggle tutor-orb-tv-goggle--right">
          <span className="tutor-orb-tv-pupil" />
        </span>
        <span className="tutor-orb-tv-bridge" />
      </div>
    </>
  );
}

function caption(activity: OrbActivity): OrbCaption {
  const icon = <TvIcon />;
  if (activity === "listening") {
    return { title: "TV MODE", subtitle: "Oído atento al mando.", icon };
  }
  if (activity === "thinking") {
    return { title: "TV MODE", subtitle: "Un segundo…", icon };
  }
  if (activity === "confused") {
    return { title: "TV MODE", subtitle: "Ehhh??? No te pillo.", icon };
  }
  return {
    title: "TV MODE",
    subtitle: "Modo sofá. Como WALL-E.",
    icon,
  };
}

export const tvOrb: OrbVariant = { Scene, caption };

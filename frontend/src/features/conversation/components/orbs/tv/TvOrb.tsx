import { OrbEyes } from "@/features/conversation/components/orbs/OrbEyes";
import type { OrbCaption, OrbVariant } from "@/features/conversation/components/orbs/variant";
import "./tv-orb.css";

function Scene() {
  return (
    <>
      <span className="tutor-orb-ring tutor-orb-ring--tv" />
      <div className="tutor-orb tutor-orb--tv">
        <OrbEyes variant="tv" />
      </div>
    </>
  );
}

function caption(): OrbCaption {
  return {
    title: "TV MODE",
    subtitle: "Orbe chill. Mando a la tele.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-orange-400" fill="none" aria-hidden>
        <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 20h8M12 6V3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  };
}

export const tvOrb: OrbVariant = { Scene, caption };

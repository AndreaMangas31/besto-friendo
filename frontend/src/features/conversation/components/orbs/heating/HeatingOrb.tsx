import { OrbEyes } from "@/features/conversation/components/orbs/OrbEyes";
import type { HeatingMood, OrbActivity } from "@/features/conversation/types/orb";
import type { OrbCaption, OrbVariant } from "@/features/conversation/components/orbs/variant";
import "./heating-orb.css";

function HeatIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-orange-400" fill="none" aria-hidden>
      <path
        d="M12 21c3.3 0 6-2.4 6-5.4 0-2.4-1.4-4.2-3.2-5.8.2 1.6-.4 3-1.6 3.6 0-3.2-1.6-5.8-4.2-7.4.4 2.4-.4 4.4-2 5.6C6.2 13 5 14.8 5 16.6 5 19.2 8 21 12 21z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Scene({ activity, mood = "cold" }: { activity: OrbActivity; mood?: HeatingMood }) {
  return (
    <>
      {mood === "warm" ? (
        <>
          <span className="tutor-orb-heat-steam tutor-orb-heat-steam--a" />
          <span className="tutor-orb-heat-steam tutor-orb-heat-steam--b" />
          <span className="tutor-orb-heat-steam tutor-orb-heat-steam--c" />
        </>
      ) : null}
      {/* Wrap + nudo dentro: overflow hidden hace que la vuelta siga el círculo. */}
      <div className="tutor-orb tutor-orb--heating" data-activity={activity} data-mood={mood}>
        <OrbEyes variant="heating" activity={activity} />
        <span className="tutor-orb-heat-scarf-wrap" />
        <span className="tutor-orb-heat-scarf-knot" />
      </div>
      <span className="tutor-orb-heat-scarf-tail" data-mood={mood} />
    </>
  );
}

function caption(activity: OrbActivity, mood: HeatingMood = "cold"): OrbCaption {
  const icon = <HeatIcon />;
  if (activity === "listening") {
    return { title: "HEAT MODE", subtitle: "Oído atento al termostato.", icon };
  }
  if (activity === "thinking") {
    return { title: "HEAT MODE", subtitle: "Ajustando la caldera…", icon };
  }
  if (activity === "confused") {
    return { title: "HEAT MODE", subtitle: "Ehhh??? ¿Más calor o menos?", icon };
  }
  if (mood === "warm") {
    return { title: "HEAT MODE", subtitle: "Ya calienta.", icon };
  }
  return { title: "HEAT MODE", subtitle: "Abrígate…", icon };
}

export const heatingOrb: OrbVariant = { Scene, caption };

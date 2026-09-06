import type { OrbActivity } from "@/features/conversation/types/orb";
import { OrbEyes } from "@/features/conversation/components/orbs/OrbEyes";
import type { OrbCaption, OrbVariant } from "@/features/conversation/components/orbs/variant";
import "./idle-orb.css";

function IdleIcon({ activity }: { activity: OrbActivity }) {
  if (activity === "listening") {
    return (
      <svg viewBox="0 0 24 16" className="h-5 w-8 text-sky-500" fill="currentColor" aria-hidden>
        <rect x="1" y="6" width="2.2" height="4" rx="1" />
        <rect x="5.5" y="3" width="2.2" height="10" rx="1" />
        <rect x="10" y="0.5" width="2.2" height="15" rx="1" />
        <rect x="14.5" y="4" width="2.2" height="8" rx="1" />
        <rect x="19" y="7" width="2.2" height="3" rx="1" />
      </svg>
    );
  }
  if (activity === "thinking") {
    return (
      <span
        className="tutor-orb-dots h-4 w-4 rounded-full border border-dashed border-zinc-400"
        aria-hidden
      />
    );
  }
  return null;
}

function Scene({ activity }: { activity: OrbActivity }) {
  return (
    <>
      <span className="tutor-orb-ring tutor-orb-ring--a" />
      <span className="tutor-orb-ring tutor-orb-ring--b" />
      <div className="tutor-orb tutor-orb--idle" data-activity={activity}>
        <OrbEyes variant="idle" activity={activity} />
      </div>
    </>
  );
}

function caption(activity: OrbActivity): OrbCaption {
  if (activity === "listening") {
    return {
      title: "ESCUCHANDO",
      subtitle: "Te oigo. Pulsa otra vez para enviar.",
      icon: <IdleIcon activity={activity} />,
    };
  }
  if (activity === "thinking") {
    return {
      title: "PENSANDO",
      subtitle: "Un segundo…",
      icon: <IdleIcon activity={activity} />,
    };
  }
  if (activity === "confused") {
    return { title: "EHHHH???", subtitle: "No te pillo.", icon: null };
  }
  if (activity === "oops") {
    return { title: "OOPS", subtitle: "¡Ey!", icon: null };
  }
  return { title: "Tu BBFF", subtitle: null, icon: null };
}

export const idleOrb: OrbVariant = { Scene, caption };

import { OrbEyes } from "@/features/conversation/components/orbs/OrbEyes";
import type { OrbActivity } from "@/features/conversation/types/orb";
import type { OrbCaption, OrbVariant } from "@/features/conversation/components/orbs/variant";
import "./chat-orb.css";

function Glasses({ listening }: { listening: boolean }) {
  return (
    <span
      className={`tutor-orb-glasses${listening ? " tutor-orb-glasses--listening" : ""}`}
      aria-hidden
    >
      <span className="tutor-orb-glasses-brow tutor-orb-glasses-brow--left" />
      <span className="tutor-orb-glasses-brow tutor-orb-glasses-brow--right" />
      <span className="tutor-orb-glasses-lens tutor-orb-glasses-lens--left" />
      <span className="tutor-orb-glasses-bridge" />
      <span className="tutor-orb-glasses-lens tutor-orb-glasses-lens--right" />
    </span>
  );
}

function Scene({ activity }: { activity: OrbActivity }) {
  return (
    <>
      <span className="tutor-orb-ring tutor-orb-ring--a tutor-orb-ring--chat" />
      <span className="tutor-orb-ring tutor-orb-ring--b tutor-orb-ring--chat" />
      <div className="tutor-orb tutor-orb--chat" data-activity={activity}>
        <OrbEyes variant="chat" activity={activity} />
        <Glasses listening={activity === "listening"} />
      </div>
    </>
  );
}

function caption(activity: OrbActivity): OrbCaption {
  const icon = (
    <span className="text-lg leading-none" aria-hidden>
      ⌢
    </span>
  );
  if (activity === "listening") {
    return { title: "CONVERSACIÓN", subtitle: "Te escucho.", icon };
  }
  if (activity === "thinking") {
    return { title: "CONVERSACIÓN", subtitle: "Un segundo…", icon };
  }
  if (activity === "confused") {
    return { title: "CONVERSACIÓN", subtitle: "Ehhh??? No te pillo.", icon };
  }
  if (activity === "oops") {
    return { title: "CONVERSACIÓN", subtitle: "OOPS. ¡Ey!", icon };
  }
  return {
    title: "CONVERSACIÓN",
    subtitle: "Pregúntame lo que quieras.",
    icon,
  };
}

export const chatOrb: OrbVariant = { Scene, caption };

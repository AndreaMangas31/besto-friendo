import { OrbEyes } from "@/features/conversation/components/orbs/OrbEyes";
import type { OrbActivity } from "@/features/conversation/types/orb";
import type { OrbCaption, OrbVariant } from "@/features/conversation/components/orbs/variant";
import "./chat-orb.css";

function PetBits({ activity }: { activity: OrbActivity }) {
  return (
    <>
      <span className="tutor-orb-chat-ear tutor-orb-chat-ear--left" aria-hidden />
      <span className="tutor-orb-chat-ear tutor-orb-chat-ear--right" aria-hidden />
      <span className="tutor-orb-chat-blush tutor-orb-chat-blush--left" aria-hidden />
      <span className="tutor-orb-chat-blush tutor-orb-chat-blush--right" aria-hidden />
      <span
        className={`tutor-orb-chat-mouth${activity === "speaking" ? " tutor-orb-chat-mouth--talk" : ""}`}
        aria-hidden
      />
    </>
  );
}

function Scene({ activity }: { activity: OrbActivity }) {
  return (
    <>
      <span className="tutor-orb-ring tutor-orb-ring--a tutor-orb-ring--chat" />
      <span className="tutor-orb-ring tutor-orb-ring--b tutor-orb-ring--chat" />
      <div className="tutor-orb tutor-orb--chat" data-activity={activity}>
        <OrbEyes variant="chat" activity={activity} />
        <PetBits activity={activity} />
      </div>
    </>
  );
}

function caption(activity: OrbActivity): OrbCaption {
  const icon = (
    <span className="text-lg leading-none" aria-hidden>
      ◠
    </span>
  );
  if (activity === "listening") {
    return { title: "BESTO", subtitle: "Te escucho.", icon };
  }
  if (activity === "thinking") {
    return { title: "BESTO", subtitle: "A ver… jajaja.", icon };
  }
  if (activity === "speaking") {
    return { title: "BESTO", subtitle: "¡Hola!", icon };
  }
  if (activity === "confused") {
    return { title: "BESTO", subtitle: "¿Ehhh? No te pillo.", icon };
  }
  if (activity === "oops") {
    return { title: "BESTO", subtitle: "¡Ey!", icon };
  }
  return {
    title: "BESTO",
    subtitle: "¿Qué necesitas?",
    icon,
  };
}

export const chatOrb: OrbVariant = { Scene, caption };

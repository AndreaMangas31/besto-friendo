import { OrbEyes } from "@/features/conversation/components/orbs/OrbEyes";
import type { OrbActivity } from "@/features/conversation/types/orb";
import type { OrbCaption, OrbVariant } from "@/features/conversation/components/orbs/variant";
import "./japanese-orb.css";

const SAKURA = [
  { top: "8%", left: "6%", size: 18, delay: "0s" },
  { top: "18%", left: "82%", size: 14, delay: "0.6s" },
  { top: "72%", left: "4%", size: 16, delay: "1.1s" },
  { top: "78%", left: "78%", size: 12, delay: "0.3s" },
  { top: "2%", left: "48%", size: 10, delay: "1.4s" },
] as const;

function Scene({ activity }: { activity: OrbActivity }) {
  return (
    <>
      {SAKURA.map((petal, index) => (
        <span
          key={index}
          className="tutor-orb-sakura"
          style={{
            top: petal.top,
            left: petal.left,
            width: petal.size,
            height: petal.size,
            animationDelay: petal.delay,
          }}
        />
      ))}
      <div className="tutor-orb tutor-orb--japanese" data-activity={activity}>
        <OrbEyes variant="japanese" activity={activity} />
        <span className="tutor-orb-hachimaki">日本</span>
      </div>
      {/* Fuera del orbe: overflow:hidden recorta la cinta al blob, el nudo sigue asomando. */}
      <span className="tutor-orb-hachimaki-knot" />
    </>
  );
}

function caption(activity: OrbActivity): OrbCaption {
  const icon = (
    <span className="text-lg leading-none" aria-hidden>
      ✿
    </span>
  );
  if (activity === "listening") {
    return { title: "JAPANESE MODE", subtitle: "Te escucho.", icon };
  }
  if (activity === "thinking") {
    return { title: "JAPANESE MODE", subtitle: "Pensando el turno…", icon };
  }
  if (activity === "confused") {
    return { title: "JAPANESE MODE", subtitle: "Ehhh??? No te pillo.", icon };
  }
  return {
    title: "JAPANESE MODE",
    subtitle: "Modo japonés activo.",
    icon,
  };
}

export const japaneseOrb: OrbVariant = { Scene, caption };

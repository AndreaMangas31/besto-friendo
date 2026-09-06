import { OrbEyes } from "@/features/conversation/components/orbs/OrbEyes";
import type { OrbCaption, OrbVariant } from "@/features/conversation/components/orbs/variant";
import "./japanese-orb.css";

const SAKURA = [
  { top: "8%", left: "6%", size: 18, delay: "0s" },
  { top: "18%", left: "82%", size: 14, delay: "0.6s" },
  { top: "72%", left: "4%", size: 16, delay: "1.1s" },
  { top: "78%", left: "78%", size: 12, delay: "0.3s" },
  { top: "2%", left: "48%", size: 10, delay: "1.4s" },
] as const;

function Scene() {
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
      <div className="tutor-orb tutor-orb--japanese">
        <OrbEyes variant="japanese" />
        <span className="tutor-orb-hachimaki">
          <span className="tutor-orb-hachimaki-knot" />
          日本
        </span>
      </div>
    </>
  );
}

function caption(): OrbCaption {
  return {
    title: "JAPANESE MODE",
    subtitle: "Modo japonés activo.",
    icon: (
      <span className="text-lg leading-none" aria-hidden>
        ✿
      </span>
    ),
  };
}

export const japaneseOrb: OrbVariant = { Scene, caption };

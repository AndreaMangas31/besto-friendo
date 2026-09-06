import "./orb-base.css";
import type { OrbActivity, OrbPersona } from "@/features/conversation/types/orb";
import { idleOrb } from "@/features/conversation/components/orbs/idle/IdleOrb";
import { japaneseOrb } from "@/features/conversation/components/orbs/japanese/JapaneseOrb";
import { playOrb } from "@/features/conversation/components/orbs/play/PlayOrb";
import { tvOrb } from "@/features/conversation/components/orbs/tv/TvOrb";
import type { OrbVariant } from "@/features/conversation/components/orbs/variant";

const ORB_VARIANTS: Record<OrbPersona, OrbVariant> = {
  idle: idleOrb,
  japanese: japaneseOrb,
  tv: tvOrb,
  play: playOrb,
};

type TutorOrbProps = {
  persona?: OrbPersona;
  activity?: OrbActivity;
  hidden?: boolean;
  luna?: boolean;
  lunaPlayKey?: number;
};

function LunaTail() {
  return <span className="tutor-orb-luna tutor-orb-luna-tail" />;
}

function LunaFace() {
  return (
    <>
      <span className="tutor-orb-luna tutor-orb-luna-ear tutor-orb-luna-ear--left">
        <span className="tutor-orb-luna-pom tutor-orb-luna-pom--a" />
        <span className="tutor-orb-luna-pom tutor-orb-luna-pom--b" />
        <span className="tutor-orb-luna-pom tutor-orb-luna-pom--c" />
      </span>
      <span className="tutor-orb-luna tutor-orb-luna-ear tutor-orb-luna-ear--right">
        <span className="tutor-orb-luna-pom tutor-orb-luna-pom--a" />
        <span className="tutor-orb-luna-pom tutor-orb-luna-pom--b" />
        <span className="tutor-orb-luna-pom tutor-orb-luna-pom--c" />
      </span>
      <span className="tutor-orb-luna tutor-orb-luna-bandana" />
      <span className="tutor-orb-luna tutor-orb-luna-nose" />
    </>
  );
}

export function TutorOrb({
  persona = "idle",
  activity = "idle",
  hidden = false,
  luna = false,
  lunaPlayKey = 0,
}: TutorOrbProps) {
  const variant = ORB_VARIANTS[persona];
  const Scene = variant.Scene;
  const copy = luna
    ? { title: "LUNA", subtitle: "Guau guau.", icon: null }
    : variant.caption(activity);

  return (
    <div className={`flex flex-col items-center gap-4 ${hidden ? "invisible" : ""}`}>
      <div
        className={`tutor-orb-stage tutor-orb-stage--${persona}`}
        data-activity={activity}
        data-luna={luna ? "on" : "off"}
        aria-hidden
      >
        <LunaTail key={`luna-tail-${lunaPlayKey}`} />
        {activity === "thinking" ? <span className="tutor-orb-think-mark">?</span> : null}
        {activity === "confused" ? (
          <span className="tutor-orb-think-mark tutor-orb-confused-mark">???</span>
        ) : null}
        <Scene activity={activity} />
        <LunaFace key={`luna-face-${lunaPlayKey}`} />
      </div>

      <div className="flex flex-col items-center gap-1 text-center">
        <div className="flex items-center gap-2">
          {copy.icon}
          <p className="text-sm font-semibold tracking-[0.18em] text-zinc-800">{copy.title}</p>
        </div>
        {copy.subtitle ? <p className="text-xs text-zinc-500">{copy.subtitle}</p> : null}
      </div>
    </div>
  );
}

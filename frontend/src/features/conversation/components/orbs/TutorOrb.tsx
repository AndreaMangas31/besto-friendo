import "./orb-base.css";
import type { HeatingMood, OrbActivity, OrbPersona } from "@/features/conversation/types/orb";
import { heatingOrb } from "@/features/conversation/components/orbs/heating/HeatingOrb";
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
  heating: heatingOrb,
};

type TutorOrbProps = {
  persona?: OrbPersona;
  activity?: OrbActivity;
  hidden?: boolean;
  luna?: boolean;
  lunaPlayKey?: number;
  heatingMood?: HeatingMood;
  /** Más grande y como pieza central (pantalla idle). */
  hero?: boolean;
  onPress?: () => void;
  pressDisabled?: boolean;
  poked?: boolean;
  pokeMark?: string | null;
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
  heatingMood = "cold",
  hero = false,
  onPress,
  pressDisabled = false,
  poked = false,
  pokeMark = null,
}: TutorOrbProps) {
  const variant = ORB_VARIANTS[persona];
  const Scene = variant.Scene;
  const mood = persona === "heating" ? heatingMood : undefined;
  const copy = luna
    ? { title: "LUNA", subtitle: "Guau guau.", icon: null }
    : variant.caption(activity, mood);
  const pressLabel = activity === "listening" ? "Detener" : "Hablar";
  const stageClass = `tutor-orb-stage tutor-orb-stage--${persona}${hero ? " tutor-orb-stage--hero" : ""}${onPress ? " tutor-orb-stage-press" : ""}`;
  const stageBody = (
    <>
      <LunaTail key={`luna-tail-${lunaPlayKey}`} />
      {activity === "thinking" && !poked ? <span className="tutor-orb-think-mark">?</span> : null}
      {activity === "confused" && !poked ? (
        <span className="tutor-orb-think-mark tutor-orb-confused-mark">???</span>
      ) : null}
      {activity === "oops" || poked ? (
        <span className="tutor-orb-think-mark tutor-orb-confused-mark tutor-orb-poke-mark">
          {pokeMark ?? "OOPS"}
        </span>
      ) : null}
      {activity === "listening" ? (
        <>
          <span className="tutor-orb-listen-ripple tutor-orb-listen-ripple--a" />
          <span className="tutor-orb-listen-ripple tutor-orb-listen-ripple--b" />
          <span className="tutor-orb-listen-ripple tutor-orb-listen-ripple--c" />
        </>
      ) : null}
      <Scene activity={activity} mood={mood} />
      <LunaFace key={`luna-face-${lunaPlayKey}`} />
    </>
  );

  return (
    <div className={`flex flex-col items-center gap-4 ${hidden ? "invisible" : ""}`}>
      {onPress ? (
        <button
          type="button"
          className={stageClass}
          data-activity={activity}
          data-luna={luna ? "on" : "off"}
          data-mood={mood}
          data-poked={poked ? "1" : undefined}
          aria-label={pressLabel}
          onClick={onPress}
          disabled={pressDisabled}
        >
          {stageBody}
        </button>
      ) : (
        <div
          className={stageClass}
          data-activity={activity}
          data-luna={luna ? "on" : "off"}
          data-mood={mood}
          data-poked={poked ? "1" : undefined}
          aria-hidden
        >
          {stageBody}
        </div>
      )}

      <div className="flex flex-col items-center gap-1.5 text-center">
        <div className="flex items-center gap-2">
          {copy.icon}
          <p className="text-base font-semibold tracking-[0.18em] text-zinc-800 sm:text-lg">
            {copy.title}
          </p>
        </div>
        {copy.subtitle ? (
          <p className="text-sm text-zinc-500 sm:text-base">{copy.subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}

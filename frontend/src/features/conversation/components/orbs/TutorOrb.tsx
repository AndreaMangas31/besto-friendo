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
};

export function TutorOrb({
  persona = "idle",
  activity = "idle",
  hidden = false,
}: TutorOrbProps) {
  const variant = ORB_VARIANTS[persona];
  const Scene = variant.Scene;
  const copy = variant.caption(activity);

  return (
    <div className={`flex flex-col items-center gap-4 ${hidden ? "invisible" : ""}`}>
      <div className={`tutor-orb-stage tutor-orb-stage--${persona}`} aria-hidden>
        <Scene activity={activity} />
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

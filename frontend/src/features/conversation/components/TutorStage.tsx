import { PracticeModes } from "@/features/conversation/components/PracticeModes";
import { TutorOrb } from "@/features/conversation/components/TutorOrb";
import type { PracticeMode } from "@/features/conversation/types/turn";

type TutorStageProps = {
  japaneseEnabled: boolean;
  mode: PracticeMode;
  onModeChange: (mode: PracticeMode) => void;
};

export function TutorStage({
  japaneseEnabled,
  mode,
  onModeChange,
}: TutorStageProps) {
  return (
    <section className="flex flex-col items-center justify-center gap-6 px-6 py-10">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
          Besto Friendo
        </h1>
        <p className="max-w-sm text-zinc-600">
          {japaneseEnabled
            ? "Tutor de japonés. Habla o cambia de modo con la voz o los botones."
            : "Di algo como enable japanese mode para abrir el chat. No hace falta que sea literal."}
        </p>
      </div>

      <TutorOrb active={japaneseEnabled} />

      {japaneseEnabled ? (
        <PracticeModes value={mode} onChange={onModeChange} />
      ) : null}
    </section>
  );
}

"use client";

import { CommandHelp } from "@/features/conversation/components/CommandHelp";
import { PracticeModes } from "@/features/conversation/components/PracticeModes";
import { TutorOrb } from "@/features/conversation/components/TutorOrb";
import { useCommandCatalog } from "@/features/conversation/hooks/useCommandCatalog";
import type { OrbActivity, OrbPersona } from "@/features/conversation/types/orb";
import type { PracticeMode } from "@/features/conversation/types/turn";

type TutorStageProps = {
  persona: OrbPersona;
  activity: OrbActivity;
  japaneseEnabled: boolean;
  mode: PracticeMode;
  onModeChange: (mode: PracticeMode) => void;
  hideOrb?: boolean;
  luna?: boolean;
  lunaPlayKey?: number;
};

export function TutorStage({
  persona,
  activity,
  japaneseEnabled,
  mode,
  onModeChange,
  hideOrb = false,
  luna = false,
  lunaPlayKey = 0,
}: TutorStageProps) {
  const catalog = useCommandCatalog();

  return (
    <section className="flex flex-col items-center justify-center gap-6 px-6 py-10">
      <div className="space-y-2 text-center">
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
            Besto Friendo
          </h1>
          <CommandHelp
            items={catalog.items}
            isLoading={catalog.isLoading}
            errorMessage={catalog.errorMessage}
          />
        </div>
        <p className="max-w-sm text-zinc-600">
          {japaneseEnabled
            ? "Tutor de japonés. Habla o cambia de modo con la voz o los botones."
            : "Pulsa la i para ver los comandos. Habla para activar el tutor o la tele."}
        </p>
      </div>

      <TutorOrb
        persona={persona}
        activity={activity}
        hidden={hideOrb}
        luna={luna}
        lunaPlayKey={lunaPlayKey}
      />

      {japaneseEnabled ? (
        <PracticeModes value={mode} onChange={onModeChange} />
      ) : null}
    </section>
  );
}

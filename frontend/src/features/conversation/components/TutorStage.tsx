"use client";

import { CommandHelp } from "@/features/conversation/components/CommandHelp";
import { PracticeModes } from "@/features/conversation/components/PracticeModes";
import { TutorOrb } from "@/features/conversation/components/TutorOrb";
import { useCommandCatalog } from "@/features/conversation/hooks/useCommandCatalog";
import type {
  HeatingMood,
  OrbActivity,
  OrbPersona,
} from "@/features/conversation/types/orb";
import type { PracticeMode } from "@/features/conversation/types/turn";

type TutorStageProps = {
  persona: OrbPersona;
  activity: OrbActivity;
  japaneseEnabled: boolean;
  conversationEnabled: boolean;
  mode: PracticeMode;
  onModeChange: (mode: PracticeMode) => void;
  hideOrb?: boolean;
  luna?: boolean;
  lunaPlayKey?: number;
  heatingMood?: HeatingMood;
  onOrbPress?: () => void;
  orbPressDisabled?: boolean;
  poked?: boolean;
  pokeMark?: string | null;
};

export function TutorStage({
  persona,
  activity,
  japaneseEnabled,
  conversationEnabled,
  mode,
  onModeChange,
  hideOrb = false,
  luna = false,
  lunaPlayKey = 0,
  heatingMood = "cold",
  onOrbPress,
  orbPressDisabled = false,
  poked = false,
  pokeMark = null,
}: TutorStageProps) {
  const catalog = useCommandCatalog();

  return (
    <section className="flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col px-4 pt-4 sm:px-6 sm:pt-6">
      <div className="flex w-full justify-end">
        <CommandHelp
          items={catalog.items}
          isLoading={catalog.isLoading}
          errorMessage={catalog.errorMessage}
        />
      </div>
      <div className="relative shrink-0">
        <div className="space-y-2  text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
            Besto Friendo
          </h1>
          <p className="mx-auto max-w-sm wrap-break-word px-1 text-zinc-600">
            {japaneseEnabled
              ? "Tutor de japonés. Habla o cambia de modo con la voz o los botones."
              : conversationEnabled
                ? "Pulsa el orbe para hablar con Besto. El texto es opcional."
                : "Pulsa el orbe para hablar. El menú lista lo que puedes hacer."}
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-4">
        <TutorOrb
          persona={persona}
          activity={activity}
          hidden={hideOrb}
          luna={luna}
          lunaPlayKey={lunaPlayKey}
          heatingMood={heatingMood}
          hero={!japaneseEnabled}
          onPress={onOrbPress}
          pressDisabled={orbPressDisabled}
          poked={poked}
          pokeMark={pokeMark}
        />
      </div>

      {japaneseEnabled ? (
        <div className="shrink-0 pb-4">
          <PracticeModes value={mode} onChange={onModeChange} />
        </div>
      ) : null}
    </section>
  );
}

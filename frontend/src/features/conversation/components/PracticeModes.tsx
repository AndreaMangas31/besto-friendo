import type { PracticeMode } from "@/features/conversation/types/turn";

type PracticeModesProps = {
  value: PracticeMode;
  onChange: (mode: PracticeMode) => void;
};

const OPTIONS: { id: PracticeMode; label: string }[] = [
  { id: "conversar", label: "Conversar" },
  { id: "corregir", label: "Corregir" },
  { id: "ideas", label: "Darme ideas" },
];

export function PracticeModes({ value, onChange }: PracticeModesProps) {
  return (
    <div className="w-full max-w-sm space-y-3">
      <p className="text-center text-sm text-zinc-500">¿Qué quieres practicar hoy?</p>
      <div className="flex flex-col gap-2">
        {OPTIONS.map((option) => {
          const selected = option.id === value;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={`rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
                selected
                  ? "bg-zinc-900 text-white"
                  : "bg-white/80 text-zinc-800 ring-1 ring-zinc-200 hover:bg-white"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

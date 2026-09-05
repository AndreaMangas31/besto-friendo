import type { JapaneseSegment } from "@/features/conversation/types/turn";

type JapaneseWithRomajiProps = {
  segments: JapaneseSegment[];
};

export function JapaneseWithRomaji({ segments }: JapaneseWithRomajiProps) {
  if (segments.length === 0) {
    return null;
  }

  return (
    <p className="mt-2 flex flex-wrap items-end gap-x-1 gap-y-2">
      {segments.map((segment, index) => (
        <span
          key={`${segment.surface}-${index}`}
          className="inline-flex flex-col items-center"
        >
          <span className="text-[11px] leading-none text-zinc-400">
            {segment.romaji}
          </span>
          <span className="mt-1 text-lg leading-tight text-zinc-900">
            {segment.surface}
          </span>
        </span>
      ))}
    </p>
  );
}

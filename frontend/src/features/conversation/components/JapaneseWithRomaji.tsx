import type { JapaneseSegment } from "@/features/conversation/types/turn";

type JapaneseWithRomajiProps = {
  segments: JapaneseSegment[];
};

export function JapaneseWithRomaji({ segments }: JapaneseWithRomajiProps) {
  if (segments.length === 0) {
    return null;
  }

  return (
    <span className="inline-flex flex-wrap items-end gap-x-1 align-bottom">
      {segments.map((segment, index) => (
        <span
          key={`${segment.surface}-${index}`}
          className="inline-flex flex-col items-center px-0.5"
        >
          <span className="text-[11px] leading-none text-zinc-400">
            {segment.romaji}
          </span>
          <span className="mt-0.5 text-lg leading-tight text-zinc-900">
            {segment.surface}
          </span>
        </span>
      ))}
    </span>
  );
}

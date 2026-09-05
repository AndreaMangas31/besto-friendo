type TutorOrbProps = {
  active?: boolean;
};

export function TutorOrb({ active = false }: TutorOrbProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`tutor-orb h-44 w-44 md:h-56 md:w-56 ${active ? "tutor-orb-active" : ""}`}
        aria-hidden
      />
      <p className="text-sm font-medium text-zinc-500">Tu tutor</p>
    </div>
  );
}

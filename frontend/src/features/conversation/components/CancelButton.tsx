type CancelButtonProps = {
  onClick: () => void;
};

export function CancelButton({ onClick }: CancelButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-14 w-full rounded-full border border-zinc-300 bg-white px-6 text-base font-medium text-zinc-800 transition-colors hover:bg-zinc-100"
    >
      Cancelar
    </button>
  );
}

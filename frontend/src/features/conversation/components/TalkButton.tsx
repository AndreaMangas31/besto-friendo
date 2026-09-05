type TalkButtonProps = {
  isRecording: boolean;
  disabled?: boolean;
  onClick: () => void;
};

export function TalkButton({ isRecording, disabled, onClick }: TalkButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`h-14 w-full rounded-full px-6 text-base font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        isRecording
          ? "bg-red-600 text-white hover:bg-red-700"
          : "bg-zinc-950 text-white hover:bg-zinc-800"
      }`}
    >
      {isRecording ? "Detener" : "Hablar"}
    </button>
  );
}

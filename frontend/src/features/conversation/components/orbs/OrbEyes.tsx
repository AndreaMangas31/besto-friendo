import type { OrbActivity } from "@/features/conversation/types/orb";

type OrbEyesProps = {
  variant: string;
  activity: OrbActivity;
};

export function OrbEyes({ variant, activity }: OrbEyesProps) {
  // OOPS reutiliza el vistazo de confundido; no hace falta otra animación de ojos.
  const eyeActivity = activity === "oops" ? "confused" : activity;

  return (
    <>
      <span
        className={`tutor-orb-eye tutor-orb-eye--left tutor-orb-eye--${variant} tutor-orb-eye--${eyeActivity}`}
      />
      <span
        className={`tutor-orb-eye tutor-orb-eye--right tutor-orb-eye--${variant} tutor-orb-eye--${eyeActivity}`}
      />
    </>
  );
}

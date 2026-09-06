import type { OrbActivity } from "@/features/conversation/types/orb";

type OrbEyesProps = {
  variant: string;
  activity: OrbActivity;
};

export function OrbEyes({ variant, activity }: OrbEyesProps) {
  return (
    <>
      <span
        className={`tutor-orb-eye tutor-orb-eye--left tutor-orb-eye--${variant} tutor-orb-eye--${activity}`}
      />
      <span
        className={`tutor-orb-eye tutor-orb-eye--right tutor-orb-eye--${variant} tutor-orb-eye--${activity}`}
      />
    </>
  );
}

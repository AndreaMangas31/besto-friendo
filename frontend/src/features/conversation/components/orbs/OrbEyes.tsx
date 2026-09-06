type OrbEyesProps = {
  variant: string;
};

export function OrbEyes({ variant }: OrbEyesProps) {
  return (
    <>
      <span className={`tutor-orb-eye tutor-orb-eye--left tutor-orb-eye--${variant}`} />
      <span className={`tutor-orb-eye tutor-orb-eye--right tutor-orb-eye--${variant}`} />
    </>
  );
}

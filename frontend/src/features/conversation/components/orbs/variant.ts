import type { ReactNode } from "react";
import type { OrbActivity } from "@/features/conversation/types/orb";

export type OrbCaption = {
  title: string;
  subtitle: string | null;
  icon: ReactNode;
};

export type OrbVariant = {
  Scene: (props: { activity: OrbActivity }) => ReactNode;
  caption: (activity: OrbActivity) => OrbCaption;
};

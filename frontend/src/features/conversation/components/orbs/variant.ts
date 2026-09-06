import type { ReactNode } from "react";
import type { OrbActivity } from "@/features/conversation/types/orb";

export type OrbCaption = {
  title: string;
  subtitle: string | null;
  icon: ReactNode;
};

export type OrbVariant = {
  Scene: () => ReactNode;
  caption: (activity: OrbActivity) => OrbCaption;
};

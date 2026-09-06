import type { ReactNode } from "react";
import type { HeatingMood, OrbActivity } from "@/features/conversation/types/orb";

export type OrbCaption = {
  title: string;
  subtitle: string | null;
  icon: ReactNode;
};

export type OrbVariant = {
  Scene: (props: { activity: OrbActivity; mood?: HeatingMood }) => ReactNode;
  caption: (activity: OrbActivity, mood?: HeatingMood) => OrbCaption;
};

import type { Metadata } from "next";
import { CoachGate } from "@/components/coach/CoachGate";

export const metadata: Metadata = {
  title: "Form Coach",
  applicationName: "Form Coach",
  description: "Film one minute of piano practice and get lesson-style feedback on your technique.",
  manifest: "/coach.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Form Coach",
  },
};

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return <CoachGate>{children}</CoachGate>;
}

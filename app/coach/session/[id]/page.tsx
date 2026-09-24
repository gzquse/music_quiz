"use client";

import { useParams } from "next/navigation";
import { useCoach, useCoachData, useSessionRecord } from "@/lib/coach/client";
import { SessionView } from "@/components/coach/SessionView";
import { CoachPage, Spinner, TopBar } from "@/components/coach/ui";

export default function SessionPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const { user } = useCoach();
  const { isLoading, session } = useSessionRecord(sessionId);
  const { instructor } = useCoachData(user.id);

  if (isLoading) {
    return (
      <CoachPage className="items-center justify-center">
        <Spinner />
      </CoachPage>
    );
  }
  if (!session) {
    return (
      <CoachPage>
        <TopBar back="/coach" />
        <p className="mt-16 text-center text-[16px] text-[var(--muted)]">This take isn&apos;t available.</p>
      </CoachPage>
    );
  }

  return (
    <SessionView
      key={session.id}
      session={session}
      instructorColor={instructor.color}
      learnFromProfessor={instructor.learnFromProfessor}
    />
  );
}

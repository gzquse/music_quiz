"use client";

import { useParams } from "next/navigation";
import { db } from "@/lib/instant";
import { useCoach } from "@/lib/coach/client";
import { DEFAULT_INSTRUCTOR } from "@/lib/coach/rubric";
import { SessionView, type SessionRecord } from "@/components/coach/SessionView";
import { CoachPage, Spinner, TopBar } from "@/components/coach/ui";

export default function SessionPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const { user } = useCoach();

  const { isLoading, data } = db.useQuery({
    coach_sessions: { $: { where: { id: sessionId, userId: user.id } } },
    coach_instructors: { $: { where: { userId: user.id } } },
  });
  const session = data?.coach_sessions?.[0];
  const instructor = data?.coach_instructors?.[0];

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
      session={session as unknown as SessionRecord}
      instructorColor={instructor?.color ?? DEFAULT_INSTRUCTOR.color}
      learnFromProfessor={instructor?.learnFromProfessor ?? DEFAULT_INSTRUCTOR.learnFromProfessor}
    />
  );
}

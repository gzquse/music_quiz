"use client";

import { useEffect, useRef } from "react";
import { db, type Question, type Quiz, type Student, type Teacher, type TeacherStudentAssignment } from "@/lib/instant";
import { NamePicker, SurveySpinner, SurveyState } from "@/components/quiz";
import {
  CURRENT_PARTICIPANT_NAMES,
  CURRENT_STAFF,
  isActiveParticipant,
  matchStaffName,
  sortParticipants,
  SURVEY_TITLE,
} from "@/lib/survey";
import {
  ensureCurrentParticipants,
  ensureCurrentStaff,
  missingCurrentParticipants,
  missingCurrentStaff,
  syncWeeklySurvey,
} from "@/lib/syncWeeklySurvey";

export default function HomePage() {
  const didSync = useRef(false);
  const { isLoading, error, data } = db.useQuery({
    quizzes: {},
    questions: {},
    students: {},
    teachers: {},
    teacher_student_assignments: {},
  });

  useEffect(() => {
    if (didSync.current || isLoading || !data) return;
    const students = (data.students || []) as Student[];
    const teachers = (data.teachers || []) as Teacher[];
    const assignments = (data.teacher_student_assignments || []) as TeacherStudentAssignment[];
    const hasWeekly = (data.quizzes || []).some(
      (quiz) => quiz.title === SURVEY_TITLE && quiz.isActive
    );
    const needsRoster = missingCurrentParticipants(students).length > 0
      || students.some(
        (s) =>
          s.isActive === false
          && CURRENT_PARTICIPANT_NAMES.some((n) => n.toLowerCase() === s.name.toLowerCase())
      );
    const activeStudents = students.filter(isActiveParticipant);
    const needsStaff =
      missingCurrentStaff(teachers).length > 0
      || CURRENT_STAFF.some((staff) => {
        const teacher = teachers.find((t) => matchStaffName(t.name, staff.name));
        if (!teacher) return true;
        return activeStudents.some(
          (student) =>
            !assignments.some(
              (a) => a.teacherId === teacher.id && a.studentId === student.id
            )
        );
      });
    if (hasWeekly && !needsRoster && !needsStaff) return;
    didSync.current = true;
    void (async () => {
      try {
        if (!hasWeekly) {
          await syncWeeklySurvey({
            quizzes: (data.quizzes || []) as Quiz[],
            questions: (data.questions || []).map((q) => ({
              ...q,
              type: q.type as Question["type"],
            })),
            students,
          });
        } else if (needsRoster) {
          await ensureCurrentParticipants(students);
        }
        await ensureCurrentStaff({ teachers, students, assignments });
      } catch (err) {
        console.error("Could not refresh weekly survey:", err);
      }
    })();
  }, [isLoading, data]);

  const quizzes = data?.quizzes || [];
  const studentQuiz =
    quizzes.find((q) => q.isActive && q.title === SURVEY_TITLE) ??
    quizzes.find((q) => q.isActive && q.variant === "student") ??
    quizzes.find((q) => q.isActive);
  const students = sortParticipants((data?.students || []).filter(isActiveParticipant));
  const teachers = (data?.teachers || []) as Teacher[];
  const instructor = teachers.find((t) => matchStaffName(t.name, CURRENT_STAFF[0].name));
  const supervisor = teachers.find((t) => matchStaffName(t.name, CURRENT_STAFF[1].name));

  if (isLoading) {
    return <SurveySpinner />;
  }

  if (error) {
    return (
      <SurveyState
        title="Could not load"
        message="Please check your connection and try again."
      />
    );
  }

  if (!studentQuiz) {
    return (
      <SurveyState
        title="No survey yet"
        message="The weekly questionnaire is not available right now."
      />
    );
  }

  return (
    <NamePicker
      students={students}
      quizId={studentQuiz.id}
      title={SURVEY_TITLE}
      description="Students tap a name. Instructors tap their name to grade a student."
      instructorHref={instructor ? `/quiz/${studentQuiz.id}/teacher/${instructor.id}` : undefined}
      supervisorHref={supervisor ? `/quiz/${studentQuiz.id}/teacher/${supervisor.id}` : undefined}
    />
  );
}

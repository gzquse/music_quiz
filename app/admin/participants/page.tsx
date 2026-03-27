"use client";

import { useState } from "react";
import { db, tx, id as genId } from "@/lib/instant";
import { Card, Button, Input, Select } from "@/components/ui";

export default function ParticipantsPage() {
  const { data, isLoading } = db.useQuery({
    students: {},
    teachers: {},
    teacher_student_assignments: {},
    quizzes: {},
  });

  const students = data?.students || [];
  const teachers = data?.teachers || [];
  const assignments = data?.teacher_student_assignments || [];
  const quizzes = data?.quizzes || [];

  const studentQuiz =
    quizzes.find((q) => q.variant === "student") ??
    quizzes.find((q) => (q.title || "").toLowerCase().includes("student"));
  const teacherQuiz =
    quizzes.find((q) => q.variant === "teacher") ??
    quizzes.find((q) => (q.title || "").toLowerCase().includes("teacher"));

  const [newStudentName, setNewStudentName] = useState("");
  const [newTeacherName, setNewTeacherName] = useState("");
  const [assignTeacher, setAssignTeacher] = useState("");
  const [assignStudent, setAssignStudent] = useState("");

  const getTeacherStudents = (teacherId: string) =>
    assignments
      .filter((a) => a.teacherId === teacherId)
      .map((a) => students.find((s) => s.id === a.studentId))
      .filter((s): s is NonNullable<typeof s> => !!s);

  const getStudentTeacher = (studentId: string) => {
    const a = assignments.find((asn) => asn.studentId === studentId);
    return a ? teachers.find((t) => t.id === a.teacherId) : null;
  };

  const addStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;
    await db.transact([
      tx.students[genId()].update({
        name: newStudentName.trim(),
        createdAt: Date.now(),
      }),
    ]);
    setNewStudentName("");
  };

  const addTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherName.trim()) return;
    await db.transact([
      tx.teachers[genId()].update({
        name: newTeacherName.trim(),
        createdAt: Date.now(),
      }),
    ]);
    setNewTeacherName("");
  };

  const deleteStudent = async (studentId: string) => {
    if (!confirm("Delete this student? Assignments will be removed.")) return;
    const toDelete = assignments.filter((a) => a.studentId === studentId);
    await db.transact([
      ...toDelete.map((a) => tx.teacher_student_assignments[a.id].delete()),
      tx.students[studentId].delete(),
    ]);
  };

  const deleteTeacher = async (teacherId: string) => {
    if (!confirm("Delete this teacher? Assignments will be removed.")) return;
    const toDelete = assignments.filter((a) => a.teacherId === teacherId);
    await db.transact([
      ...toDelete.map((a) => tx.teacher_student_assignments[a.id].delete()),
      tx.teachers[teacherId].delete(),
    ]);
  };

  const addAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTeacher || !assignStudent) return;
    const exists = assignments.some(
      (a) => a.teacherId === assignTeacher && a.studentId === assignStudent
    );
    if (exists) {
      alert("This assignment already exists.");
      return;
    }
    await db.transact([
      tx.teacher_student_assignments[genId()].update({
        teacherId: assignTeacher,
        studentId: assignStudent,
      }),
    ]);
    setAssignTeacher("");
    setAssignStudent("");
  };

  const removeAssignment = async (assignmentId: string) => {
    await db.transact([tx.teacher_student_assignments[assignmentId].delete()]);
  };

  const updateStudentGroup = async (studentId: string, group: string) => {
    await db.transact([
      tx.students[studentId].update({ group: group || undefined }),
    ]);
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    alert("Link copied to clipboard");
  };

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">Participants</h1>
      <p className="text-[var(--muted)] mb-8">
        Manage students, teachers, and assignments. Copy links for respondents.
      </p>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Students */}
        <Card>
          <h2 className="text-xl font-semibold mb-4">Students</h2>
          <form onSubmit={addStudent} className="flex gap-2 mb-4">
            <Input
              placeholder="Student name"
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
              className="flex-1"
            />
            <Button type="submit">Add</Button>
          </form>
          <ul className="space-y-2">
            {students.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0"
              >
                <div>
                  <span className="font-medium">{s.name}</span>
                  {s.group && (
                    <span className="text-sm text-[var(--muted)] ml-2">
                      (Group {s.group})
                    </span>
                  )}
                  {getStudentTeacher(s.id) && (
                    <span className="text-sm text-[var(--muted)] ml-2">
                      (Teacher: {getStudentTeacher(s.id)?.name})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={s.group ?? ""}
                    onChange={(e) => updateStudentGroup(s.id, e.target.value)}
                    options={[
                      { value: "", label: "Group" },
                      { value: "A", label: "A" },
                      { value: "B", label: "B" },
                    ]}
                    className="w-16 py-1.5 text-sm"
                  />
                  {studentQuiz && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        copyLink(`${baseUrl}/quiz/${studentQuiz.id}/student/${s.id}`)
                      }
                    >
                      Copy Link
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteStudent(s.id)}
                    className="text-[var(--error)] hover:bg-[var(--error)]/10"
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        {/* Teachers */}
        <Card>
          <h2 className="text-xl font-semibold mb-4">Teachers</h2>
          <form onSubmit={addTeacher} className="flex gap-2 mb-4">
            <Input
              placeholder="Teacher name"
              value={newTeacherName}
              onChange={(e) => setNewTeacherName(e.target.value)}
              className="flex-1"
            />
            <Button type="submit">Add</Button>
          </form>
          <ul className="space-y-2">
            {teachers.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0"
              >
                <div>
                  <span className="font-medium">{t.name}</span>
                  <span className="text-sm text-[var(--muted)] ml-2">
                    ({getTeacherStudents(t.id).length} students)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {teacherQuiz && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        copyLink(`${baseUrl}/quiz/${teacherQuiz.id}/teacher/${t.id}`)
                      }
                    >
                      Copy Link
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteTeacher(t.id)}
                    className="text-[var(--error)] hover:bg-[var(--error)]/10"
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Assignments */}
      <Card className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Teacher-Student Assignments</h2>
        <form onSubmit={addAssignment} className="flex flex-wrap gap-4 mb-6">
          <Select
            label="Teacher"
            value={assignTeacher}
            onChange={(e) => setAssignTeacher(e.target.value)}
            options={[
              { value: "", label: "Select teacher" },
              ...teachers.map((t) => ({ value: t.id, label: t.name })),
            ]}
            className="w-48"
          />
          <Select
            label="Student"
            value={assignStudent}
            onChange={(e) => setAssignStudent(e.target.value)}
            options={[
              { value: "", label: "Select student" },
              ...students.map((s) => ({ value: s.id, label: s.name })),
            ]}
            className="w-48"
          />
          <div className="flex items-end">
            <Button type="submit">Assign</Button>
          </div>
        </form>
        <div className="space-y-4">
          {teachers.map((t) => {
            const teacherStudents = getTeacherStudents(t.id);
            if (teacherStudents.length === 0) return null;
            return (
              <div key={t.id} className="border border-[var(--border)] rounded-lg p-4">
                <h3 className="font-medium mb-2">{t.name}</h3>
                <ul className="flex flex-wrap gap-2">
                  {teacherStudents.map((s) => {
                    const a = assignments.find(
                      (asn) => asn.teacherId === t.id && asn.studentId === s.id
                    );
                    return (
                      <li
                        key={s.id}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[var(--surface-hover)] text-sm"
                      >
                        {s.name}
                        <button
                          type="button"
                          onClick={() => a && removeAssignment(a.id)}
                          className="text-[var(--muted)] hover:text-[var(--error)]"
                        >
                          x
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </Card>

      {(!studentQuiz || !teacherQuiz) && (
        <Card className="mt-8 bg-[var(--accent)]/10 border-[var(--accent)]">
          <p className="text-sm text-[var(--muted)]">
            Create a survey with variant &quot;Student&quot; and one with variant
            &quot;Teacher&quot; to generate respondent links. Run the seed script to create
            them automatically.
          </p>
        </Card>
      )}
    </div>
  );
}

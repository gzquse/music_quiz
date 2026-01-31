# 8-Week Operation Guide

Base URL: **https://music-quiz-xi.vercel.app**

---

## Setup (one-time)

1. **Admin login**: https://music-quiz-xi.vercel.app/admin/login

2. **Participants** (Admin > Participants):
   - 6 students: Student 1, Student 2, Student 3, Student 4, Student 5, Student 6
   - 4 teachers: Teacher 1, Teacher 2, Teacher 3, Teacher 4
   - Assignments:
     - Teacher 1 -> Student 1, Student 2
     - Teacher 2 -> Student 3, Student 4
     - Teacher 3 -> Student 5
     - Teacher 4 -> Student 6

3. **Survey links**: Copy all 10 links from Admin Dashboard > Survey Links (or Participants page)

---

## 10 Links (replace IDs with your actual values from Admin)

### Student links (6) – one per student, same link used every week

```
https://music-quiz-xi.vercel.app/quiz/STUDENT_QUIZ_ID/student/STUDENT_1_ID
https://music-quiz-xi.vercel.app/quiz/STUDENT_QUIZ_ID/student/STUDENT_2_ID
https://music-quiz-xi.vercel.app/quiz/STUDENT_QUIZ_ID/student/STUDENT_3_ID
https://music-quiz-xi.vercel.app/quiz/STUDENT_QUIZ_ID/student/STUDENT_4_ID
https://music-quiz-xi.vercel.app/quiz/STUDENT_QUIZ_ID/student/STUDENT_5_ID
https://music-quiz-xi.vercel.app/quiz/STUDENT_QUIZ_ID/student/STUDENT_6_ID
```

### Teacher links (4) – one per teacher, same link used every week

```
https://music-quiz-xi.vercel.app/quiz/TEACHER_QUIZ_ID/teacher/TEACHER_1_ID
https://music-quiz-xi.vercel.app/quiz/TEACHER_QUIZ_ID/teacher/TEACHER_2_ID
https://music-quiz-xi.vercel.app/quiz/TEACHER_QUIZ_ID/teacher/TEACHER_3_ID
https://music-quiz-xi.vercel.app/quiz/TEACHER_QUIZ_ID/teacher/TEACHER_4_ID
```

**Get real links**: Admin Dashboard or Participants > Copy Link next to each name.

---

## Weekly workflow (repeat for Weeks 1–8)

### Each week

| Day | Who | Action |
|-----|-----|--------|
| Lesson day | Students 1–6 | Each student opens their link, completes self-assessment, submits |
| Lesson day | Teachers 1–4 | Each teacher opens their link, selects each of their students, completes assessment for each, submits |

### Expected responses per week

- **6 student responses** (one per student)
- **6 teacher responses** (Teacher 1: 2, Teacher 2: 2, Teacher 3: 1, Teacher 4: 1)

### Total over 8 weeks

- **48 student responses**
- **48 teacher responses**
- **96 responses total**

---

## Admin tasks

### View responses
- **Admin > Quizzes** > open Teacher or Student survey
- **View Responses** – teacher-centric view, filter by Week 1–8
- Click student name to see their self-assessment

### View analytics
- **Admin > Quizzes** > Teacher survey > **Analytics**
- **Teacher Summaries**: 4 sections (one per teacher)
  - Each shows their students
  - 8-week table: Week x Q1–Q6 scores
  - Chart: average by week per student

### Share links
- Send each student their unique student link (one per student)
- Send each teacher their unique teacher link (one per teacher)
- Same 10 links for all 8 weeks

---

## Example link distribution

| Recipient | Link type | Use |
|-----------|-----------|-----|
| Student 1 | Student link 1 | Self-assessment every week |
| Student 2 | Student link 2 | Self-assessment every week |
| ... | ... | ... |
| Student 6 | Student link 6 | Self-assessment every week |
| Teacher 1 | Teacher link 1 | Assess Student 1 and 2 every week |
| Teacher 2 | Teacher link 2 | Assess Student 3 and 4 every week |
| Teacher 3 | Teacher link 3 | Assess Student 5 every week |
| Teacher 4 | Teacher link 4 | Assess Student 6 every week |

---

## Week tracking

Responses are grouped by week. The system uses the week stored in response metadata. For seeded data, weeks 1–8 are pre-filled. For new submissions, ensure the app records the current week (e.g. from a week selector or submission date).

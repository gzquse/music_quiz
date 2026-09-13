export const SURVEY_TITLE = "Weekly Piano Practice Movement Questionnaire";

export const SURVEY_INSTRUCTOR = "Lingxi Xu";
export const SURVEY_SUPERVISOR = "Dr. Carla Cash";

export const CURRENT_PARTICIPANT_NAMES = [
  "Maria",
  "Xinlin",
  "Jacob",
  "Ana",
  "Heriberto",
] as const;

export const DEFAULT_SCALE_LABELS = [
  "Never",
  "Rarely",
  "Sometimes",
  "Often",
  "Very often",
] as const;

export const SURVEY_DESCRIPTION =
  "Please think about your piano practice during the past week. For each statement, select the number that best describes how often you experienced or did this during your piano practice.";

export const SURVEY_INSTRUCTIONS = `${SURVEY_DESCRIPTION}

Rating scale:
1 = Never
2 = Rarely
3 = Sometimes
4 = Often
5 = Very often`;

export const WEEKLY_QUESTIONS = [
  {
    title: "Body Observation",
    text: "During my piano practice this week, I noticed changes in how different parts of my body felt or moved.",
    type: "scale" as const,
    required: true,
  },
  {
    title: "Body Connection",
    text: "During my piano practice this week, I noticed connections between different parts of my body while playing.",
    type: "scale" as const,
    required: true,
  },
  {
    title: "Experimentation",
    text: "During my piano practice this week, I experimented with different ways of using my body while playing.",
    type: "scale" as const,
    required: true,
  },
  {
    title: "Musical Outcome",
    text: "When I changed how I moved my body, my playing felt or sounded different.",
    type: "scale" as const,
    required: true,
  },
  {
    title: "Application",
    text: "During my piano practice this week, I consciously applied ideas about body movement from the class to my piano playing.",
    type: "scale" as const,
    required: true,
  },
  {
    title: "Self-Correction",
    text: "During my piano practice this week, I noticed and adjusted my movement when something felt tense, inefficient, or uncomfortable.",
    type: "scale" as const,
    required: true,
  },
  {
    title: "Optional Brief Comment",
    text: "If you noticed an important physical or musical change during your practice this week, please describe it briefly.",
    type: "text" as const,
    required: false,
  },
] as const;

export function sortParticipants<T extends { name: string }>(people: T[]): T[] {
  return [...people].sort((a, b) => {
    const ai = CURRENT_PARTICIPANT_NAMES.findIndex((n) => n.toLowerCase() === a.name.toLowerCase());
    const bi = CURRENT_PARTICIPANT_NAMES.findIndex((n) => n.toLowerCase() === b.name.toLowerCase());
    if (ai === -1 && bi === -1) return a.name.localeCompare(b.name);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

export function isActiveParticipant<T extends { isActive?: boolean }>(person: T): boolean {
  return person.isActive !== false;
}

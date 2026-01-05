"use client";

import { Question } from "@/lib/instant";
import { ScaleInput } from "./ScaleInput";
import { ChoiceInput } from "./ChoiceInput";
import { Textarea } from "@/components/ui";

interface QuestionRendererProps {
  question: Question;
  value: string | number | null;
  onChange: (value: string | number) => void;
  scaleLabels?: string[];
  scaleMin?: number;
  scaleMax?: number;
}

export function QuestionRenderer({
  question,
  value,
  onChange,
  scaleLabels = ["Not at all", "Slightly", "Moderately", "Very", "Extremely"],
  scaleMin = 1,
  scaleMax = 5,
}: QuestionRendererProps) {
  switch (question.type) {
    case "scale":
      return (
        <ScaleInput
          name={question.id}
          value={typeof value === "number" ? value : null}
          onChange={onChange}
          min={scaleMin}
          max={scaleMax}
          labels={scaleLabels}
          required={question.required}
        />
      );

    case "choice":
      return (
        <ChoiceInput
          name={question.id}
          value={typeof value === "string" ? value : null}
          onChange={onChange}
          options={question.options || []}
          required={question.required}
        />
      );

    case "text":
      return (
        <Textarea
          id={question.id}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your response here..."
          required={question.required}
        />
      );

    default:
      return null;
  }
}


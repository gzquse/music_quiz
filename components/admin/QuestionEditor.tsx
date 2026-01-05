"use client";

import { useState } from "react";
import { Question } from "@/lib/instant";
import { Button, Input, Select, Card } from "@/components/ui";

interface QuestionEditorProps {
  question: Partial<Question>;
  index: number;
  onChange: (question: Partial<Question>) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export function QuestionEditor({
  question,
  index,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: QuestionEditorProps) {
  const [optionsText, setOptionsText] = useState(
    question.options?.join("\n") || ""
  );

  const handleOptionsChange = (text: string) => {
    setOptionsText(text);
    const options = text.split("\n").filter((o) => o.trim());
    onChange({ ...question, options: options.length > 0 ? options : null });
  };

  return (
    <Card className="relative">
      <div className="flex items-start gap-4">
        {/* Drag Handle / Index */}
        <div className="flex flex-col items-center gap-1">
          <span className="w-8 h-8 rounded-full bg-[var(--surface-hover)] flex items-center justify-center text-sm font-medium">
            {index + 1}
          </span>
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={!onMoveUp}
              className="p-1 hover:bg-[var(--surface-hover)] rounded disabled:opacity-30"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={!onMoveDown}
              className="p-1 hover:bg-[var(--surface-hover)] rounded disabled:opacity-30"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Question Content */}
        <div className="flex-1 space-y-4">
          <Input
            label="Question Text"
            value={question.text || ""}
            onChange={(e) => onChange({ ...question, text: e.target.value })}
            placeholder="Enter your question..."
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Question Type"
              value={question.type || "scale"}
              onChange={(e) =>
                onChange({
                  ...question,
                  type: e.target.value as "scale" | "text" | "choice",
                })
              }
              options={[
                { value: "scale", label: "Scale (1-5)" },
                { value: "text", label: "Text Input" },
                { value: "choice", label: "Multiple Choice" },
              ]}
            />

            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={question.required ?? true}
                  onChange={(e) =>
                    onChange({ ...question, required: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-[var(--border)]"
                />
                <span className="text-sm">Required</span>
              </label>
            </div>
          </div>

          {question.type === "choice" && (
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Options (one per line)
              </label>
              <textarea
                value={optionsText}
                onChange={(e) => handleOptionsChange(e.target.value)}
                placeholder="Option 1&#10;Option 2&#10;Option 3"
                className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] min-h-[100px] resize-y"
              />
            </div>
          )}
        </div>

        {/* Delete Button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-[var(--error)] hover:bg-[var(--error)]/10"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </Button>
      </div>
    </Card>
  );
}


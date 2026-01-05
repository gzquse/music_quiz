"use client";

import Link from "next/link";
import { Quiz } from "@/lib/instant";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter, Button } from "@/components/ui";
import { formatDate } from "@/lib/utils";

interface QuizCardProps {
  quiz: Quiz;
}

export function QuizCard({ quiz }: QuizCardProps) {
  return (
    <Card hover className="flex flex-col">
      <CardHeader>
        <CardTitle>{quiz.title}</CardTitle>
        <CardDescription>{quiz.description}</CardDescription>
      </CardHeader>
      <CardFooter className="mt-auto flex items-center justify-between">
        <span className="text-sm text-[var(--muted)]">
          Created {formatDate(quiz.createdAt)}
        </span>
        <Link href={`/quiz/${quiz.id}`}>
          <Button size="sm">Take Survey</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}


'use client';

interface ChatSuggestedQuestionsProps {
  questions: string[];
  onSelect: (question: string) => void;
}

export function ChatSuggestedQuestions({ questions, onSelect }: ChatSuggestedQuestionsProps) {
  return (
    <div className="flex flex-wrap gap-1.5 pl-1">
      {questions.map((question, index) => (
        <button
          key={index}
          onClick={() => onSelect(question)}
          className="rounded-xl bg-brand-50 px-3 py-1.5 text-left text-xs font-bold text-brand-700 transition-colors hover:bg-brand-100"
        >
          {question}
        </button>
      ))}
    </div>
  );
}

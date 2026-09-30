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
          className="border border-primary px-3 py-1.5 text-left text-xs font-medium text-primary transition-colors hover:bg-primary hover:text-white"
        >
          {question}
        </button>
      ))}
    </div>
  );
}

"use client";

type TypingIndicatorProps = {
  names: string[];
};

export function TypingIndicator({ names }: TypingIndicatorProps) {
  if (names.length === 0) return null;

  const text =
    names.length === 1
      ? `${names[0]} está digitando...`
      : names.length === 2
        ? `${names[0]} e ${names[1]} estão digitando...`
        : `${names[0]} e mais ${names.length - 1} estão digitando...`;

  return (
    <div className="px-1 py-1">
      <p className="text-muted-foreground animate-pulse text-xs">{text}</p>
    </div>
  );
}

import { Info } from "lucide-react";

type FieldTooltipProps = {
  text: string;
};

/**
 * Inline info icon with tooltip text via title attribute.
 * Used beside form labels to explain fields without clutter.
 */
export function FieldTooltip({ text }: FieldTooltipProps) {
  return (
    <span
      title={text}
      className="text-muted-foreground hover:text-foreground inline-flex cursor-help transition-colors"
    >
      <Info className="size-3.5" />
    </span>
  );
}

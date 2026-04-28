import { Pause, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { pauseAgentAction } from "@/features/agents/pause-action";

type PauseAgentButtonProps = {
  id: string;
  intent: "pause" | "resume";
};

export function PauseAgentButton({ id, intent }: PauseAgentButtonProps) {
  const label = intent === "pause" ? "Pausar" : "Despausar";
  const Icon = intent === "pause" ? Pause : Play;

  return (
    <form action={pauseAgentAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="intent" value={intent} />
      <Button type="submit" variant="outline" size="sm">
        <Icon />
        {label}
      </Button>
    </form>
  );
}

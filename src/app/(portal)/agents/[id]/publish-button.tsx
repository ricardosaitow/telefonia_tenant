import { Rocket } from "lucide-react";

import { Button } from "@/components/ui/button";
import { publishAgentAction } from "@/features/agents/publish-action";

type PublishAgentButtonProps = {
  id: string;
  /** Se já tem currentVersionId, label vira "Republicar" + variant outline. */
  hasCurrent: boolean;
};

export function PublishAgentButton({ id, hasCurrent }: PublishAgentButtonProps) {
  return (
    <form action={publishAgentAction}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant={hasCurrent ? "outline" : "default"} size="sm">
        <Rocket />
        {hasCurrent ? "Republicar" : "Publicar"}
      </Button>
    </form>
  );
}

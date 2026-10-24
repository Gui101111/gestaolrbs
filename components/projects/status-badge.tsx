import { AlertTriangle, CheckCircle2, Clock, FileEdit, Loader2, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PROJECT_STATUSES, type ProjectStatus } from "@/lib/constants/domain";

const ICONS: Record<ProjectStatus, React.ComponentType<{ className?: string }>> = {
  draft: FileEdit,
  queued: Clock,
  processing: Loader2,
  ready: CheckCircle2,
  revision_requested: RotateCcw,
  completed: CheckCircle2,
  failed: AlertTriangle,
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const key = (status in PROJECT_STATUSES ? status : "draft") as ProjectStatus;
  const def = PROJECT_STATUSES[key];
  const Icon = ICONS[key];
  return (
    <Badge variant={def.tone} className={className}>
      <Icon className={key === "processing" ? "animate-spin" : undefined} />
      {def.label}
    </Badge>
  );
}

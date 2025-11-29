import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ModuleStatus = "not_started" | "in_progress" | "completed";
type QuizStatus = "passed" | "failed";

interface StatusBadgeProps {
  status: ModuleStatus | QuizStatus;
  className?: string;
  showIcon?: boolean;
}

const statusConfig = {
  not_started: {
    label: "Not Started",
    icon: Circle,
    className: "bg-muted text-muted-foreground",
  },
  in_progress: {
    label: "In Progress",
    icon: Clock,
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  passed: {
    label: "Passed",
    icon: CheckCircle2,
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
};

export function StatusBadge({ status, className, showIcon = true }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "border-0 font-medium",
        config.className,
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {config.label}
    </Badge>
  );
}

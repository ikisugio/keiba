"use client"

import { Badge } from "@/components/ui/badge"
import type { ScrapeStatus } from "@/lib/scrape-types"
import { cn } from "@/lib/utils"

const statusConfig: Record<
  ScrapeStatus,
  { label: string; dotClass: string; badgeClass: string }
> = {
  idle: {
    label: "Idle",
    dotClass: "bg-muted-foreground",
    badgeClass: "bg-muted text-muted-foreground border-border",
  },
  running: {
    label: "Running",
    dotClass: "bg-info animate-pulse",
    badgeClass: "bg-info/10 text-info border-info/20",
  },
  success: {
    label: "Success",
    dotClass: "bg-success",
    badgeClass: "bg-success/10 text-success border-success/20",
  },
  failed: {
    label: "Failed",
    dotClass: "bg-destructive",
    badgeClass: "bg-destructive/10 text-destructive border-destructive/20",
  },
  partial: {
    label: "Partial",
    dotClass: "bg-warning",
    badgeClass: "bg-warning/10 text-warning border-warning/20",
  },
}

export function StatusBadge({ status }: { status: ScrapeStatus }) {
  const config = statusConfig[status]
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 font-medium", config.badgeClass)}
    >
      <span className={cn("size-1.5 rounded-full", config.dotClass)} />
      {config.label}
    </Badge>
  )
}

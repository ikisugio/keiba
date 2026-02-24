import { Activity } from "lucide-react"

interface DashboardHeaderProps {
  totalWorkflows: number
  totalStages: number
  totalJobs: number
}

export function DashboardHeader({
  totalWorkflows,
  totalStages,
  totalJobs,
}: DashboardHeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-primary" />
          <h1 className="text-sm font-semibold text-foreground tracking-tight">
            Scrape Manager
          </h1>
        </div>
      </div>
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
        <span>
          <span className="font-medium text-foreground">{totalWorkflows}</span>{" "}
          workflows
        </span>
        <span>
          <span className="font-medium text-foreground">{totalStages}</span>{" "}
          stages
        </span>
        <span>
          <span className="font-medium text-foreground">{totalJobs}</span> jobs
        </span>
      </div>
    </header>
  )
}

"use client"

import { useState, useMemo } from "react"
import { format, formatDistanceToNow } from "date-fns"
import { ja } from "date-fns/locale"
import {
  Play,
  RotateCw,
  Globe,
  BarChart3,
  TrendingUp,
  Calendar,
  Layers,
  Clock,
} from "lucide-react"
import type { ScrapeStatus, ScrapeWorkflow, ScrapeJob } from "@/lib/scrape-types"
import { StatusBadge } from "@/components/status-badge"
import { JobTable } from "@/components/url-table"
import { LogViewer } from "@/components/log-viewer"
import { JobDetailModal } from "@/components/job-detail-modal"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

interface WorkflowOverviewProps {
  workflow: ScrapeWorkflow
  onRunWorkflow: (workflowId: string) => void
  onRescrapeJob: (jobId: string) => void
  rescrapingJobs: string[]
  isWorkflowRunning: boolean
}

export function WorkflowOverview({
  workflow,
  onRunWorkflow,
  onRescrapeJob,
  rescrapingJobs,
  isWorkflowRunning,
}: WorkflowOverviewProps) {
  const [jobSearch, setJobSearch] = useState("")
  const [jobStatusFilter, setJobStatusFilter] = useState<ScrapeStatus | "all">("all")
  const [selectedJob, setSelectedJob] = useState<ScrapeJob | null>(null)
  const [jobModalOpen, setJobModalOpen] = useState(false)
  const [topHeight, setTopHeight] = useState(() => {
    if (typeof window === "undefined") return 260
    const saved = localStorage.getItem("workflow-top-height")
    return saved ? Math.max(80, Number(saved)) : 260
  })

  const handleDividerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    const startY = e.clientY
    const startH = topHeight
    const onMove = (ev: MouseEvent) => {
      setTopHeight(Math.max(80, startH + (ev.clientY - startY)))
    }
    const onUp = () => {
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup", onUp)
      setTopHeight((prev) => {
        localStorage.setItem("workflow-top-height", String(prev))
        return prev
      })
    }
    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onUp)
  }

  // Aggregate all jobs from all stages, tagging each with its stage name
  const allJobs = useMemo(() => {
    const jobs: (ScrapeJob & { _stageName: string })[] = []
    for (const stage of [...workflow.stages].sort((a, b) => a.order - b.order)) {
      for (const job of stage.jobs) {
        jobs.push({ ...job, _stageName: stage.name })
      }
    }
    return jobs
  }, [workflow.stages])

  const totalJobs = allJobs.length
  const successJobs = allJobs.filter((j) => j.status === "success").length
  const failedJobs = allJobs.filter((j) => j.status === "failed").length
  const runningJobs = allJobs.filter((j) => j.status === "running").length
  const totalStages = workflow.stages.length

  const handleJobClick = (job: ScrapeJob) => {
    const latest = allJobs.find((j) => j.id === job.id) ?? job
    setSelectedJob(latest)
    setJobModalOpen(true)
  }

  const currentModalJob = selectedJob
    ? allJobs.find((j) => j.id === selectedJob.id) ?? selectedJob
    : null

  // Stage status summary
  const stageSummary = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const s of workflow.stages) {
      counts[s.status] = (counts[s.status] ?? 0) + 1
    }
    return counts
  }, [workflow.stages])

  return (
    <div className="flex flex-col h-full">
      {/* Upper section - resizable */}
      <div style={{ height: topHeight }} className="flex-none overflow-hidden">
      {/* Workflow header */}
      <div className="flex items-start justify-between px-6 py-4 border-b border-border shrink-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-lg font-semibold text-foreground truncate">
              {workflow.name}
            </h2>
            <StatusBadge status={workflow.status} />
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            {workflow.description}
          </p>

          <div className="flex items-center gap-5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Layers className="size-3.5" />
              {totalStages} stages
            </span>
            <span className="flex items-center gap-1.5">
              <Globe className="size-3.5" />
              {totalJobs} jobs
            </span>
            <span className="flex items-center gap-1.5">
              <BarChart3 className="size-3.5" />
              {workflow.totalItems.toLocaleString()} items
            </span>
            <span className="flex items-center gap-1.5">
              <TrendingUp className="size-3.5" />
              {workflow.successRate}% success
            </span>
            {workflow.schedule && (
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3.5" />
                <code className="text-foreground bg-secondary px-1 py-0.5 rounded text-[10px]">
                  {workflow.schedule}
                </code>
              </span>
            )}
            {workflow.lastRunAt && (
              <span className="flex items-center gap-1.5">
                <Clock className="size-3.5" />
                {formatDistanceToNow(new Date(workflow.lastRunAt), {
                  addSuffix: true,
                  locale: ja,
                })}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRunWorkflow(workflow.id)}
            disabled={isWorkflowRunning || workflow.status === "running"}
            className="gap-1.5 text-foreground border-border hover:bg-accent cursor-pointer"
          >
            {isWorkflowRunning || workflow.status === "running" ? (
              <>
                <RotateCw className="size-3.5 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="size-3.5" />
                Run All
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stage status summary bar */}
      <div className="px-6 py-2.5 border-b border-border shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Stages
          </span>
          <div className="flex items-center gap-2">
            {workflow.stages
              .sort((a, b) => a.order - b.order)
              .map((stage, idx) => (
                <div key={stage.id} className="flex items-center gap-1.5">
                  {idx > 0 && (
                    <div className="w-4 h-px bg-border" />
                  )}
                  <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-secondary/50 text-xs">
                    <span className="inline-flex items-center justify-center size-4 rounded bg-secondary text-[9px] font-bold text-foreground">
                      {stage.order}
                    </span>
                    <span className="text-foreground font-medium truncate max-w-24">
                      {stage.name}
                    </span>
                    <StatusBadge status={stage.status} />
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Progress bar when running */}
      {workflow.status === "running" && (
        <div className="px-6 py-2 border-b border-border shrink-0">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>
              Jobs: {successJobs + failedJobs} / {totalJobs} completed
            </span>
            <span>
              {runningJobs > 0
                ? `${runningJobs} in progress`
                : "Completing..."}
            </span>
          </div>
          <Progress
            value={((successJobs + failedJobs) / totalJobs) * 100}
            className="h-1.5"
          />
        </div>
      )}

      {/* Summary cards -- fixed above scroll */}
      <div className="grid grid-cols-5 gap-3 px-6 py-3 border-b border-border shrink-0">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="text-xs text-muted-foreground mb-1">Stages</div>
          <div className="text-xl font-semibold text-foreground font-mono">
            {totalStages}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="text-xs text-muted-foreground mb-1">Total Jobs</div>
          <div className="text-xl font-semibold text-foreground font-mono">
            {totalJobs}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="text-xs text-muted-foreground mb-1">Success</div>
          <div className="text-xl font-semibold text-success font-mono">
            {successJobs}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="text-xs text-muted-foreground mb-1">Failed</div>
          <div className="text-xl font-semibold text-destructive font-mono">
            {failedJobs}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="text-xs text-muted-foreground mb-1">Items</div>
          <div className="text-xl font-semibold text-foreground font-mono">
            {workflow.totalItems.toLocaleString()}
          </div>
        </div>
      </div>
      </div>

      {/* Resize divider */}
      <div
        onMouseDown={handleDividerMouseDown}
        className="h-1.5 cursor-ns-resize shrink-0 hover:bg-primary/20 active:bg-primary/30 transition-colors group relative"
      >
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-10 h-0.5 rounded-full bg-border group-hover:bg-primary/50 transition-colors" />
      </div>

      {/* Tabs: All Jobs | Workflow Logs */}
      <Tabs defaultValue="jobs" className="flex-1 flex flex-col min-h-0">
        <div className="px-6 pt-3 border-b border-border shrink-0">
          <TabsList className="bg-secondary">
            <TabsTrigger value="jobs" className="gap-1.5 text-xs cursor-pointer data-[state=active]:bg-primary/15 data-[state=active]:text-primary dark:data-[state=active]:text-primary data-[state=active]:border-primary/30">
              <Globe className="size-3" />
              All Jobs ({totalJobs})
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-1.5 text-xs cursor-pointer data-[state=active]:bg-primary/15 data-[state=active]:text-primary dark:data-[state=active]:text-primary data-[state=active]:border-primary/30">
              <BarChart3 className="size-3" />
              Workflow Logs ({workflow.logs.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="jobs"
          className="flex-1 overflow-auto p-6 pt-4 mt-0"
        >
          <JobTable
            jobs={allJobs}
            onRescrape={onRescrapeJob}
            rescraping={rescrapingJobs}
            jobSearch={jobSearch}
            onJobSearchChange={setJobSearch}
            jobStatusFilter={jobStatusFilter}
            onJobStatusFilterChange={setJobStatusFilter}
            onJobClick={handleJobClick}
            showStageColumn
          />
        </TabsContent>

        <TabsContent
          value="logs"
          className="flex-1 overflow-auto p-6 pt-4 mt-0"
        >
          <LogViewer logs={workflow.logs} />
        </TabsContent>
      </Tabs>

      {/* Job detail modal */}
      <JobDetailModal
        job={currentModalJob}
        open={jobModalOpen}
        onOpenChange={setJobModalOpen}
        onRescrape={onRescrapeJob}
        isRescraping={
          currentModalJob
            ? rescrapingJobs.includes(currentModalJob.id)
            : false
        }
      />
    </div>
  )
}

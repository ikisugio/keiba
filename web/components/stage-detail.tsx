"use client"

import { useState } from "react"
import { format, formatDistanceToNow } from "date-fns"
import { ja } from "date-fns/locale"
import {
  Play,
  RotateCw,
  Clock,
  Globe,
  BarChart3,
  TrendingUp,
  Calendar,
} from "lucide-react"
import type { ScrapeStatus, ScrapeStage, ScrapeJob, ScrapeWorkflow } from "@/lib/scrape-types"
import { StatusBadge } from "@/components/status-badge"
import { JobTable } from "@/components/url-table"
import { LogViewer } from "@/components/log-viewer"
import { JobDetailModal } from "@/components/job-detail-modal"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

interface StageDetailProps {
  workflow: ScrapeWorkflow
  stage: ScrapeStage
  onRunStage: (workflowId: string, stageId: string) => void
  onRescrapeJob: (jobId: string) => void
  rescrapingJobs: string[]
  isStageRunning: boolean
}

export function StageDetail({
  workflow,
  stage,
  onRunStage,
  onRescrapeJob,
  rescrapingJobs,
  isStageRunning,
}: StageDetailProps) {
  const [jobSearch, setJobSearch] = useState("")
  const [jobStatusFilter, setJobStatusFilter] = useState<ScrapeStatus | "all">(
    "all"
  )
  const [selectedJob, setSelectedJob] = useState<ScrapeJob | null>(null)
  const [jobModalOpen, setJobModalOpen] = useState(false)

  const totalJobs = stage.jobs.length
  const successJobs = stage.jobs.filter((j) => j.status === "success").length
  const failedJobs = stage.jobs.filter((j) => j.status === "failed").length
  const runningJobs = stage.jobs.filter((j) => j.status === "running").length

  const handleJobClick = (job: ScrapeJob) => {
    const latest = stage.jobs.find((j) => j.id === job.id) ?? job
    setSelectedJob(latest)
    setJobModalOpen(true)
  }

  const currentModalJob = selectedJob
    ? stage.jobs.find((j) => j.id === selectedJob.id) ?? selectedJob
    : null

  return (
    <div className="flex flex-col h-full">
      {/* Stage header */}
      <div className="flex items-start justify-between px-6 py-4 border-b border-border shrink-0">
        <div className="min-w-0 flex-1">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <span className="truncate">{workflow.name}</span>
            <span>/</span>
            <span className="text-foreground font-medium truncate">
              {stage.name}
            </span>
          </div>

          <div className="flex items-center gap-3 mb-1">
            <span className="inline-flex items-center justify-center size-6 rounded-md bg-secondary text-xs font-bold text-foreground shrink-0">
              {stage.order}
            </span>
            <h2 className="text-lg font-semibold text-foreground truncate">
              {stage.name}
            </h2>
            <StatusBadge status={stage.status} />
          </div>
          <p className="text-sm text-muted-foreground mb-3 pl-9">
            {stage.description}
          </p>

          <div className="flex items-center gap-5 text-xs text-muted-foreground pl-9">
            <span className="flex items-center gap-1.5">
              <Globe className="size-3.5" />
              {totalJobs} jobs
            </span>
            <span className="flex items-center gap-1.5">
              <BarChart3 className="size-3.5" />
              {stage.totalItems.toLocaleString()} items
            </span>
            <span className="flex items-center gap-1.5">
              <TrendingUp className="size-3.5" />
              {stage.successRate}% success
            </span>
            {workflow.schedule && (
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3.5" />
                <code className="text-foreground bg-secondary px-1 py-0.5 rounded text-[10px]">
                  {workflow.schedule}
                </code>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRunStage(workflow.id, stage.id)}
            disabled={isStageRunning || stage.status === "running"}
            className="gap-1.5 text-foreground border-border hover:bg-accent cursor-pointer"
          >
            {isStageRunning || stage.status === "running" ? (
              <>
                <RotateCw className="size-3.5 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="size-3.5" />
                Run Stage
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Progress bar when running */}
      {stage.status === "running" && (
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
      <div className="grid grid-cols-4 gap-3 px-6 py-3 border-b border-border shrink-0">
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
            {stage.totalItems.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Tabs: Jobs | Stage Logs */}
      <Tabs defaultValue="jobs" className="flex-1 flex flex-col min-h-0">
        <div className="px-6 pt-3 border-b border-border shrink-0">
          <TabsList className="bg-secondary">
            <TabsTrigger value="jobs" className="gap-1.5 text-xs cursor-pointer data-[state=active]:bg-primary/15 data-[state=active]:text-primary dark:data-[state=active]:text-primary data-[state=active]:border-primary/30">
              <Globe className="size-3" />
              Jobs ({totalJobs})
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-1.5 text-xs cursor-pointer data-[state=active]:bg-primary/15 data-[state=active]:text-primary dark:data-[state=active]:text-primary data-[state=active]:border-primary/30">
              <BarChart3 className="size-3" />
              Stage Logs ({stage.logs.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="jobs"
          className="flex-1 overflow-auto p-6 pt-4 mt-0"
        >
          <JobTable
            jobs={stage.jobs}
            onRescrape={onRescrapeJob}
            rescraping={rescrapingJobs}
            jobSearch={jobSearch}
            onJobSearchChange={setJobSearch}
            jobStatusFilter={jobStatusFilter}
            onJobStatusFilterChange={setJobStatusFilter}
            onJobClick={handleJobClick}
          />
        </TabsContent>

        <TabsContent
          value="logs"
          className="flex-1 overflow-auto p-6 pt-4 mt-0"
        >
          <LogViewer logs={stage.logs} />
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

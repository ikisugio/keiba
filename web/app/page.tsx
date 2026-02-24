"use client"

import { useState, useMemo, useCallback, useRef } from "react"
import { MOCK_WORKFLOWS } from "@/lib/mock-data"
import type { ScrapeWorkflow, LogEntry } from "@/lib/scrape-types"
import { DashboardHeader } from "@/components/dashboard-header"
import { WorkflowSidebar } from "@/components/workflow-sidebar"
import { StageDetail } from "@/components/stage-detail"
import { WorkflowOverview } from "@/components/workflow-overview"
import { Layers } from "lucide-react"

// ------- helpers -------

function computeStageStats(
  stages: ScrapeWorkflow["stages"]
): Pick<ScrapeWorkflow, "totalItems" | "successRate"> {
  const allJobs = stages.flatMap((s) => s.jobs)
  const totalItems = allJobs.reduce((sum, j) => sum + j.itemsCollected, 0)
  const completed = allJobs.filter(
    (j) => j.status === "success" || j.status === "failed"
  )
  const successRate =
    completed.length > 0
      ? Math.round(
          (completed.filter((j) => j.status === "success").length /
            allJobs.length) *
            100
        )
      : 0
  return { totalItems, successRate }
}

function deriveStageStatus(
  jobs: ScrapeWorkflow["stages"][number]["jobs"]
): ScrapeStatus {
  const statuses = jobs.map((j) => j.status)
  if (statuses.every((s) => s === "idle")) return "idle"
  if (statuses.some((s) => s === "running")) return "running"
  const success = statuses.filter((s) => s === "success").length
  const failed = statuses.filter((s) => s === "failed").length
  if (failed === 0 && success === statuses.length) return "success"
  if (success === 0 && failed === statuses.length) return "failed"
  if (success + failed === statuses.length) return "partial"
  return "running"
}

function deriveWorkflowStatus(
  stages: ScrapeWorkflow["stages"]
): ScrapeStatus {
  const statuses = stages.map((s) => s.status)
  if (statuses.every((s) => s === "idle")) return "idle"
  if (statuses.some((s) => s === "running")) return "running"
  const success = statuses.filter((s) => s === "success").length
  const failed = statuses.filter((s) => s === "failed").length
  if (failed === 0 && success === statuses.length) return "success"
  if (success === 0 && failed === statuses.length) return "failed"
  if (success + failed === statuses.length) return "partial"
  return "running"
}

// ------- component -------

export default function DashboardPage() {
  const [workflows, setWorkflows] = useState<ScrapeWorkflow[]>(MOCK_WORKFLOWS)
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null)
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null)
  const [rescrapingJobs, setRescrapingJobs] = useState<string[]>([])
  const [runningWorkflows, setRunningWorkflows] = useState<string[]>([])
  const [runningStages, setRunningStages] = useState<string[]>([])

  // ---------- resizable sidebar ----------
  const [sidebarWidth, setSidebarWidth] = useState(320)
  const isResizing = useRef(false)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isResizing.current = true
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"

    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return
      const newWidth = Math.min(Math.max(e.clientX, 240), 600)
      setSidebarWidth(newWidth)
    }

    const onMouseUp = () => {
      isResizing.current = false
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      document.removeEventListener("mousemove", onMouseMove)
      document.removeEventListener("mouseup", onMouseUp)
    }

    document.addEventListener("mousemove", onMouseMove)
    document.addEventListener("mouseup", onMouseUp)
  }, [])

  // ---------- derived ----------

  const totals = useMemo(() => {
    const totalStages = workflows.reduce((sum, wf) => sum + wf.stages.length, 0)
    const totalJobs = workflows.reduce(
      (sum, wf) => sum + wf.stages.reduce((s, st) => s + st.jobs.length, 0),
      0
    )
    return { totalWorkflows: workflows.length, totalStages, totalJobs }
  }, [workflows])

  const selectedWorkflow = useMemo(
    () => workflows.find((wf) => wf.id === selectedWorkflowId) ?? null,
    [workflows, selectedWorkflowId]
  )

  const selectedStage = useMemo(() => {
    if (!selectedWorkflow || !selectedStageId) return null
    return selectedWorkflow.stages.find((s) => s.id === selectedStageId) ?? null
  }, [selectedWorkflow, selectedStageId])

  // ---------- log helpers ----------

  const addWorkflowLog = useCallback(
    (workflowId: string, level: LogEntry["level"], message: string) => {
      const entry: LogEntry = {
        id: `wl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        level,
        message,
      }
      setWorkflows((prev) =>
        prev.map((wf) =>
          wf.id === workflowId ? { ...wf, logs: [...wf.logs, entry] } : wf
        )
      )
    },
    []
  )

  const addStageLog = useCallback(
    (
      workflowId: string,
      stageId: string,
      level: LogEntry["level"],
      message: string
    ) => {
      const entry: LogEntry = {
        id: `sl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        level,
        message,
      }
      setWorkflows((prev) =>
        prev.map((wf) =>
          wf.id === workflowId
            ? {
                ...wf,
                stages: wf.stages.map((s) =>
                  s.id === stageId
                    ? { ...s, logs: [...s.logs, entry] }
                    : s
                ),
              }
            : wf
        )
      )
    },
    []
  )

  const addJobLog = useCallback(
    (jobId: string, level: LogEntry["level"], message: string) => {
      const entry: LogEntry = {
        id: `jl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        level,
        message,
      }
      setWorkflows((prev) =>
        prev.map((wf) => ({
          ...wf,
          stages: wf.stages.map((s) => ({
            ...s,
            jobs: s.jobs.map((j) =>
              j.id === jobId ? { ...j, logs: [...j.logs, entry] } : j
            ),
          })),
        }))
      )
    },
    []
  )

  // ---------- update helpers ----------

  const updateJob = useCallback(
    (
      jobId: string,
      updater: (
        j: ScrapeWorkflow["stages"][number]["jobs"][number]
      ) => ScrapeWorkflow["stages"][number]["jobs"][number]
    ) => {
      setWorkflows((prev) =>
        prev.map((wf) => {
          const hasJob = wf.stages.some((s) =>
            s.jobs.some((j) => j.id === jobId)
          )
          if (!hasJob) return wf

          const newStages = wf.stages.map((s) => {
            const hasThisJob = s.jobs.some((j) => j.id === jobId)
            if (!hasThisJob) return s

            const newJobs = s.jobs.map((j) =>
              j.id === jobId ? updater(j) : j
            )
            const stageStats = computeStageStats([{ ...s, jobs: newJobs }])
            return {
              ...s,
              jobs: newJobs,
              status: deriveStageStatus(newJobs),
              totalItems: stageStats.totalItems,
              successRate: stageStats.successRate,
            }
          })

          const wfStats = computeStageStats(newStages)
          return {
            ...wf,
            stages: newStages,
            status: deriveWorkflowStatus(newStages),
            totalItems: wfStats.totalItems,
            successRate: wfStats.successRate,
          }
        })
      )
    },
    []
  )

  // ---------- reorder stages ----------

  const handleReorderStages = useCallback(
    (workflowId: string, stageIds: string[]) => {
      setWorkflows((prev) =>
        prev.map((wf) => {
          if (wf.id !== workflowId) return wf
          const reordered = stageIds
            .map((id, idx) => {
              const stage = wf.stages.find((s) => s.id === id)
              return stage ? { ...stage, order: idx + 1 } : null
            })
            .filter(Boolean) as typeof wf.stages
          return { ...wf, stages: reordered }
        })
      )
    },
    []
  )

  // ---------- select handlers ----------

  const handleSelectWorkflow = useCallback((id: string) => {
    setSelectedWorkflowId(id)
    setSelectedStageId(null)
  }, [])

  const handleSelectStage = useCallback(
    (workflowId: string, stageId: string) => {
      setSelectedWorkflowId(workflowId)
      setSelectedStageId(stageId)
    },
    []
  )

  // ---------- rescrape single job ----------

  const handleRescrapeJob = useCallback(
    (jobId: string) => {
      if (rescrapingJobs.includes(jobId)) return
      setRescrapingJobs((prev) => [...prev, jobId])

      let wfId = ""
      let stgId = ""
      let jobUrl = ""
      for (const wf of workflows) {
        for (const s of wf.stages) {
          const j = s.jobs.find((j) => j.id === jobId)
          if (j) {
            wfId = wf.id
            stgId = s.id
            jobUrl = j.url
            break
          }
        }
        if (wfId) break
      }

      if (!wfId) return

      const shortUrl = jobUrl.replace(/^https?:\/\//, "")
      addJobLog(jobId, "info", `Re-scrape initiated: ${shortUrl}`)
      addStageLog(wfId, stgId, "info", `Re-scraping: ${shortUrl}`)
      addWorkflowLog(wfId, "info", `Re-scraping job: ${shortUrl}`)

      updateJob(jobId, (j) => ({ ...j, status: "running" as ScrapeStatus }))

      setTimeout(
        () => {
          const isSuccess = Math.random() > 0.3
          const newItems = isSuccess
            ? Math.floor(Math.random() * 200) + 20
            : 0
          const responseCode = isSuccess
            ? 200
            : [403, 429, 500, 503][Math.floor(Math.random() * 4)]

          const resultMsg = isSuccess
            ? `Completed: ${newItems} items (200 OK)`
            : `FAILED: HTTP ${responseCode}`

          addJobLog(jobId, isSuccess ? "info" : "error", resultMsg)
          addStageLog(
            wfId,
            stgId,
            isSuccess ? "info" : "error",
            `${shortUrl} - ${resultMsg}`
          )
          addWorkflowLog(
            wfId,
            isSuccess ? "info" : "error",
            `${shortUrl} - ${resultMsg}`
          )

          updateJob(jobId, (j) => ({
            ...j,
            status: (isSuccess ? "success" : "failed") as ScrapeStatus,
            lastScrapedAt: new Date().toISOString(),
            responseCode,
            itemsCollected: isSuccess
              ? j.itemsCollected + newItems
              : j.itemsCollected,
            errorMessage: isSuccess
              ? null
              : `HTTP ${responseCode}: Request failed`,
          }))

          setRescrapingJobs((prev) => prev.filter((id) => id !== jobId))
        },
        2000 + Math.random() * 3000
      )
    },
    [
      workflows,
      rescrapingJobs,
      addJobLog,
      addStageLog,
      addWorkflowLog,
      updateJob,
    ]
  )

  // ---------- run single stage ----------

  const handleRunStage = useCallback(
    (workflowId: string, stageId: string) => {
      if (runningStages.includes(stageId)) return
      setRunningStages((prev) => [...prev, stageId])

      const wf = workflows.find((w) => w.id === workflowId)
      const stage = wf?.stages.find((s) => s.id === stageId)
      if (!wf || !stage) return

      addStageLog(
        workflowId,
        stageId,
        "info",
        `Stage run initiated: ${stage.name}`
      )
      addWorkflowLog(workflowId, "info", `Running stage: ${stage.name}`)

      setWorkflows((prev) =>
        prev.map((w) =>
          w.id === workflowId
            ? {
                ...w,
                status: "running" as ScrapeStatus,
                lastRunAt: new Date().toISOString(),
                stages: w.stages.map((s) =>
                  s.id === stageId
                    ? {
                        ...s,
                        status: "running" as ScrapeStatus,
                        jobs: s.jobs.map((j) => ({
                          ...j,
                          status: "running" as ScrapeStatus,
                        })),
                      }
                    : s
                ),
              }
            : w
        )
      )

      stage.jobs.forEach((job, index) => {
        setTimeout(
          () => {
            const isSuccess = Math.random() > 0.2
            const newItems = isSuccess
              ? Math.floor(Math.random() * 300) + 30
              : 0
            const responseCode = isSuccess
              ? 200
              : [403, 429, 500, 503][Math.floor(Math.random() * 4)]
            const shortUrl = job.url.replace(/^https?:\/\//, "")
            const resultMsg = isSuccess
              ? `${newItems} items (200 OK)`
              : `FAILED: ${responseCode}`

            addJobLog(
              job.id,
              isSuccess ? "info" : "error",
              `Completed: ${resultMsg}`
            )
            addStageLog(
              workflowId,
              stageId,
              isSuccess ? "info" : "error",
              `${shortUrl} - ${resultMsg}`
            )
            addWorkflowLog(
              workflowId,
              isSuccess ? "info" : "error",
              `${shortUrl} - ${resultMsg}`
            )

            updateJob(job.id, (j) => ({
              ...j,
              status: (isSuccess ? "success" : "failed") as ScrapeStatus,
              lastScrapedAt: new Date().toISOString(),
              responseCode,
              itemsCollected: isSuccess ? newItems : 0,
              errorMessage: isSuccess
                ? null
                : `HTTP ${responseCode}: Request failed`,
            }))

            if (index === stage.jobs.length - 1) {
              addStageLog(
                workflowId,
                stageId,
                "info",
                "Stage run completed"
              )
              addWorkflowLog(
                workflowId,
                "info",
                `Stage completed: ${stage.name}`
              )
              setRunningStages((prev) =>
                prev.filter((id) => id !== stageId)
              )
            }
          },
          (index + 1) * (1500 + Math.random() * 2000)
        )
      })
    },
    [
      workflows,
      runningStages,
      addJobLog,
      addStageLog,
      addWorkflowLog,
      updateJob,
    ]
  )

  // ---------- run entire workflow ----------

  const handleRunWorkflow = useCallback(
    (workflowId: string) => {
      if (runningWorkflows.includes(workflowId)) return
      setRunningWorkflows((prev) => [...prev, workflowId])

      const wf = workflows.find((w) => w.id === workflowId)
      if (!wf) return

      addWorkflowLog(workflowId, "info", "Workflow run initiated by user")

      setWorkflows((prev) =>
        prev.map((w) =>
          w.id === workflowId
            ? {
                ...w,
                status: "running" as ScrapeStatus,
                lastRunAt: new Date().toISOString(),
                stages: w.stages.map((s) => ({
                  ...s,
                  status: "running" as ScrapeStatus,
                  jobs: s.jobs.map((j) => ({
                    ...j,
                    status: "running" as ScrapeStatus,
                  })),
                })),
              }
            : w
        )
      )

      const allJobsWithContext: {
        job: (typeof wf.stages)[number]["jobs"][number]
        stage: (typeof wf.stages)[number]
        isLastInStage: boolean
        isLastOverall: boolean
      }[] = []

      ;[...wf.stages]
        .sort((a, b) => a.order - b.order)
        .forEach((stage) => {
          stage.jobs.forEach((job, jIdx) => {
            allJobsWithContext.push({
              job,
              stage,
              isLastInStage: jIdx === stage.jobs.length - 1,
              isLastOverall: false,
            })
          })
        })

      if (allJobsWithContext.length > 0) {
        allJobsWithContext[allJobsWithContext.length - 1].isLastOverall = true
      }

      allJobsWithContext.forEach((ctx, index) => {
        setTimeout(
          () => {
            const isSuccess = Math.random() > 0.2
            const newItems = isSuccess
              ? Math.floor(Math.random() * 300) + 30
              : 0
            const responseCode = isSuccess
              ? 200
              : [403, 429, 500, 503][Math.floor(Math.random() * 4)]
            const shortUrl = ctx.job.url.replace(/^https?:\/\//, "")
            const resultMsg = isSuccess
              ? `${newItems} items (200 OK)`
              : `FAILED: ${responseCode}`

            addJobLog(
              ctx.job.id,
              isSuccess ? "info" : "error",
              `Completed: ${resultMsg}`
            )
            addStageLog(
              workflowId,
              ctx.stage.id,
              isSuccess ? "info" : "error",
              `${shortUrl} - ${resultMsg}`
            )
            addWorkflowLog(
              workflowId,
              isSuccess ? "info" : "error",
              `[${ctx.stage.name}] ${shortUrl} - ${resultMsg}`
            )

            updateJob(ctx.job.id, (j) => ({
              ...j,
              status: (isSuccess ? "success" : "failed") as ScrapeStatus,
              lastScrapedAt: new Date().toISOString(),
              responseCode,
              itemsCollected: isSuccess ? newItems : 0,
              errorMessage: isSuccess
                ? null
                : `HTTP ${responseCode}: Request failed`,
            }))

            if (ctx.isLastInStage) {
              addStageLog(
                workflowId,
                ctx.stage.id,
                "info",
                `Stage completed: ${ctx.stage.name}`
              )
              addWorkflowLog(
                workflowId,
                "info",
                `Stage completed: ${ctx.stage.name}`
              )
            }

            if (ctx.isLastOverall) {
              addWorkflowLog(
                workflowId,
                "info",
                "Workflow run completed"
              )
              setRunningWorkflows((prev) =>
                prev.filter((id) => id !== workflowId)
              )
            }
          },
          (index + 1) * (1500 + Math.random() * 2000)
        )
      })
    },
    [
      workflows,
      runningWorkflows,
      addJobLog,
      addStageLog,
      addWorkflowLog,
      updateJob,
    ]
  )

  // ---------- render ----------

  return (
    <div className="flex flex-col h-screen bg-background">
      <DashboardHeader
        totalWorkflows={totals.totalWorkflows}
        totalStages={totals.totalStages}
        totalJobs={totals.totalJobs}
      />

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside
          className="border-r border-border bg-card shrink-0 relative"
          style={{ width: sidebarWidth }}
        >
          <WorkflowSidebar
            workflows={workflows}
            selectedWorkflowId={selectedWorkflowId}
            selectedStageId={selectedStageId}
            onSelectWorkflow={handleSelectWorkflow}
            onSelectStage={handleSelectStage}
            onReorderStages={handleReorderStages}
            onRunWorkflow={handleRunWorkflow}
            onRunStage={handleRunStage}
            runningWorkflows={runningWorkflows}
            runningStages={runningStages}
          />

          {/* Resize handle */}
          <div
            onMouseDown={handleMouseDown}
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/40 active:bg-primary/60 transition-colors z-10 group"
          >
            <div className="absolute top-1/2 -translate-y-1/2 right-0 w-1 h-8 rounded-full bg-muted-foreground/30 group-hover:bg-primary/60 transition-colors" />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-hidden bg-background">
          {selectedWorkflow && selectedStage ? (
            <StageDetail
              key={selectedStageId}
              workflow={selectedWorkflow}
              stage={selectedStage}
              onRunStage={handleRunStage}
              onRescrapeJob={handleRescrapeJob}
              rescrapingJobs={rescrapingJobs}
              isStageRunning={runningStages.includes(selectedStage.id)}
            />
          ) : selectedWorkflow ? (
            <WorkflowOverview
              key={selectedWorkflowId}
              workflow={selectedWorkflow}
              onRunWorkflow={handleRunWorkflow}
              onRescrapeJob={handleRescrapeJob}
              rescrapingJobs={rescrapingJobs}
              isWorkflowRunning={runningWorkflows.includes(selectedWorkflow.id)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Layers className="size-12 mb-3 opacity-30" />
              <p className="text-sm">Select a workflow to begin</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

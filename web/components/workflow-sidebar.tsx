"use client"

import { useState, useMemo } from "react"
import { formatDistanceToNow } from "date-fns"
import { ja } from "date-fns/locale"
import {
  Layers,
  Clock,
  BarChart3,
  ChevronRight,
  GripVertical,
  Play,
  RotateCw,
  Globe,
  Search,
  ArrowLeft,
} from "lucide-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { ScrapeWorkflow, ScrapeStage, ScrapeStatus } from "@/lib/scrape-types"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// ---------- compact filter bar (reusable) ----------

const STATUS_OPTIONS: { value: ScrapeStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "running", label: "Running" },
  { value: "success", label: "Success" },
  { value: "partial", label: "Partial" },
  { value: "failed", label: "Failed" },
  { value: "idle", label: "Idle" },
]

function CompactFilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  counts,
  placeholder,
}: {
  searchQuery: string
  onSearchChange: (q: string) => void
  statusFilter: ScrapeStatus | "all"
  onStatusFilterChange: (s: ScrapeStatus | "all") => void
  counts: Record<string, number>
  placeholder: string
}) {
  return (
    <div className="flex flex-col gap-2">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
        <input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-7 pr-2 py-1.5 rounded-md bg-secondary border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
      </div>
      {/* Status pills */}
      <div className="flex flex-wrap gap-1">
        {STATUS_OPTIONS.map((opt) => {
          const count =
            opt.value === "all"
              ? Object.values(counts).reduce((a, b) => a + b, 0)
              : counts[opt.value] ?? 0
          if (opt.value !== "all" && count === 0) return null
          return (
            <button
              key={opt.value}
              onClick={() => onStatusFilterChange(opt.value)}
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer",
                statusFilter === opt.value
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              {opt.label}
              <Badge
                variant="secondary"
                className="px-1 py-0 text-[9px] h-3.5 min-w-3.5 justify-center bg-secondary/80 text-muted-foreground"
              >
                {count}
              </Badge>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ---------- Sortable Stage Item ----------

function SortableStageItem({
  stage,
  isSelected,
  onSelect,
  onRunStage,
  isStageRunning,
}: {
  stage: ScrapeStage
  isSelected: boolean
  onSelect: () => void
  onRunStage: () => void
  isStageRunning: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const jobCount = stage.jobs.length
  const successCount = stage.jobs.filter((j) => j.status === "success").length
  const failedCount = stage.jobs.filter((j) => j.status === "failed").length

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-1.5 rounded-md border transition-all cursor-grab active:cursor-grabbing",
        isDragging && "z-50 opacity-80 shadow-lg shadow-black/30",
        isSelected
          ? "border-primary/50 bg-primary/5"
          : "border-border bg-card hover:border-border/80 hover:bg-accent/30"
      )}
      {...attributes}
      {...listeners}
    >
      {/* Drag handle (visual indicator only) */}
      <div className="flex items-center justify-center shrink-0 w-6 h-full text-muted-foreground rounded-l-md">
        <GripVertical className="size-3" />
      </div>

      {/* Stage content (clickable) */}
      <button
        onClick={onSelect}
        className="flex-1 min-w-0 py-2 pr-1 text-left cursor-pointer"
      >
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="inline-flex items-center justify-center size-3.5 rounded bg-secondary text-[8px] font-bold text-foreground shrink-0">
            {stage.order}
          </span>
          <span className="text-[11px] font-medium text-foreground truncate">
            {stage.name}
          </span>
          <StatusBadge status={stage.status} />
        </div>
        <div className="flex items-center gap-2.5 text-[9px] text-muted-foreground pl-5">
          <span className="flex items-center gap-0.5">
            <Globe className="size-2.5" />
            {jobCount}
          </span>
          <span className="flex items-center gap-0.5">
            <BarChart3 className="size-2.5" />
            {stage.totalItems.toLocaleString()}
          </span>
          {successCount > 0 && (
            <span className="text-success">{successCount} ok</span>
          )}
          {failedCount > 0 && (
            <span className="text-destructive">{failedCount} err</span>
          )}
        </div>
      </button>

      {/* Run stage button */}
      <Button
        variant="ghost"
        size="icon"
        className="size-5 mr-1.5 shrink-0 text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer"
        onClick={(e) => {
          e.stopPropagation()
          onRunStage()
        }}
        disabled={isStageRunning || stage.status === "running"}
      >
        {isStageRunning || stage.status === "running" ? (
          <RotateCw className="size-2.5 animate-spin" />
        ) : (
          <Play className="size-2.5" />
        )}
        <span className="sr-only">Run stage</span>
      </Button>
    </div>
  )
}

// ---------- Sidebar ----------

interface WorkflowSidebarProps {
  workflows: ScrapeWorkflow[]
  selectedWorkflowId: string | null
  selectedStageId: string | null
  onSelectWorkflow: (id: string) => void
  onSelectStage: (workflowId: string, stageId: string) => void
  onReorderStages: (workflowId: string, stageIds: string[]) => void
  onRunWorkflow: (id: string) => void
  onRunStage: (workflowId: string, stageId: string) => void
  runningWorkflows: string[]
  runningStages: string[]
}

export function WorkflowSidebar({
  workflows,
  selectedWorkflowId,
  selectedStageId,
  onSelectWorkflow,
  onSelectStage,
  onReorderStages,
  onRunWorkflow,
  onRunStage,
  runningWorkflows,
  runningStages,
}: WorkflowSidebarProps) {
  const [expandedWorkflowId, setExpandedWorkflowId] = useState<string | null>(
    selectedWorkflowId
  )

  // Workflow-level search/filter
  const [wfSearch, setWfSearch] = useState("")
  const [wfStatusFilter, setWfStatusFilter] = useState<ScrapeStatus | "all">("all")

  // Stage-level search/filter (per expanded workflow)
  const [stageSearch, setStageSearch] = useState("")
  const [stageStatusFilter, setStageStatusFilter] = useState<ScrapeStatus | "all">("all")

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Workflow counts & filtering
  const wfCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const wf of workflows) {
      counts[wf.status] = (counts[wf.status] ?? 0) + 1
    }
    return counts
  }, [workflows])

  const filteredWorkflows = useMemo(() => {
    return workflows.filter((wf) => {
      const matchesSearch =
        wfSearch === "" ||
        wf.name.toLowerCase().includes(wfSearch.toLowerCase()) ||
        wf.stages.some((s) =>
          s.name.toLowerCase().includes(wfSearch.toLowerCase())
        )
      const matchesStatus =
        wfStatusFilter === "all" || wf.status === wfStatusFilter
      return matchesSearch && matchesStatus
    })
  }, [workflows, wfSearch, wfStatusFilter])

  const handleWorkflowClick = (workflowId: string) => {
    // Always select workflow (for main panel)
    onSelectWorkflow(workflowId)

    if (expandedWorkflowId === workflowId) {
      setExpandedWorkflowId(null)
    } else {
      setExpandedWorkflowId(workflowId)
      // Reset stage filters when switching workflows
      setStageSearch("")
      setStageStatusFilter("all")
    }
  }

  const handleDragEnd = (
    workflowId: string,
    stages: ScrapeStage[],
    event: DragEndEvent
  ) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = stages.findIndex((s) => s.id === active.id)
    const newIndex = stages.findIndex((s) => s.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = [...stages]
    const [moved] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, moved)

    onReorderStages(
      workflowId,
      reordered.map((s) => s.id)
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sidebar header */}
      <div className="px-3 pt-3 pb-2 border-b border-border shrink-0">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Workflows
        </span>
        {/* Workflow filter/search */}
        <div className="mt-2">
          <CompactFilterBar
            searchQuery={wfSearch}
            onSearchChange={setWfSearch}
            statusFilter={wfStatusFilter}
            onStatusFilterChange={setWfStatusFilter}
            counts={wfCounts}
            placeholder="Search workflows..."
          />
        </div>
      </div>

      {/* Workflow list */}
      <div className="flex-1 overflow-y-auto">
        {filteredWorkflows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Search className="size-5 mb-2 opacity-30" />
            <p className="text-xs">No workflows found</p>
          </div>
        )}
        {filteredWorkflows.map((workflow) => {
          const isExpanded = expandedWorkflowId === workflow.id
          const isWorkflowRunning = runningWorkflows.includes(workflow.id)
          const stageCount = workflow.stages.length
          const jobCount = workflow.stages.reduce(
            (sum, s) => sum + s.jobs.length,
            0
          )
          const allStagesSorted = [...workflow.stages].sort(
            (a, b) => a.order - b.order
          )

          // Stage counts & filtering (only for expanded workflow)
          const stageCounts: Record<string, number> = {}
          for (const s of allStagesSorted) {
            stageCounts[s.status] = (stageCounts[s.status] ?? 0) + 1
          }
          const filteredStages = isExpanded
            ? allStagesSorted.filter((s) => {
                const matchesSearch =
                  stageSearch === "" ||
                  s.name.toLowerCase().includes(stageSearch.toLowerCase()) ||
                  s.jobs.some((j) =>
                    j.url.toLowerCase().includes(stageSearch.toLowerCase())
                  )
                const matchesStatus =
                  stageStatusFilter === "all" ||
                  s.status === stageStatusFilter
                return matchesSearch && matchesStatus
              })
            : allStagesSorted

          return (
            <div key={workflow.id} className="border-b border-border">
              {/* Workflow row */}
              <button
                onClick={() => handleWorkflowClick(workflow.id)}
                className={cn(
                  "flex items-center gap-2.5 w-full px-3 py-2.5 text-left transition-colors cursor-pointer",
                  selectedWorkflowId === workflow.id
                    ? "bg-primary/10 border-l-2 border-l-primary"
                    : "hover:bg-accent/50 border-l-2 border-l-transparent"
                )}
              >
                <ChevronRight
                  className={cn(
                    "size-3 text-muted-foreground transition-transform shrink-0",
                    isExpanded && "rotate-90"
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-foreground truncate">
                      {workflow.name}
                    </span>
                    <StatusBadge status={workflow.status} />
                  </div>
                  <div className="flex items-center gap-2.5 text-[9px] text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <Layers className="size-2.5" />
                      {stageCount}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Globe className="size-2.5" />
                      {jobCount}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <BarChart3 className="size-2.5" />
                      {workflow.totalItems.toLocaleString()}
                    </span>
                    {workflow.lastRunAt && (
                      <span className="flex items-center gap-0.5">
                        <Clock className="size-2.5" />
                        {formatDistanceToNow(new Date(workflow.lastRunAt), {
                          addSuffix: true,
                          locale: ja,
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </button>

              {/* Expanded: stage area */}
              {isExpanded && (
                <div className="overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200">
                  {/* Stage header with Run All + stage filter */}
                  <div className="px-3 pt-2 pb-1.5 bg-secondary/20 border-t border-border/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Stages ({stageCount})
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-2 text-[10px] gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          onRunWorkflow(workflow.id)
                        }}
                        disabled={
                          isWorkflowRunning ||
                          workflow.status === "running"
                        }
                      >
                        {isWorkflowRunning ||
                        workflow.status === "running" ? (
                          <>
                            <RotateCw className="size-2.5 animate-spin" />
                            Running...
                          </>
                        ) : (
                          <>
                            <Play className="size-2.5" />
                            Run All
                          </>
                        )}
                      </Button>
                    </div>
                    <CompactFilterBar
                      searchQuery={stageSearch}
                      onSearchChange={setStageSearch}
                      statusFilter={stageStatusFilter}
                      onStatusFilterChange={setStageStatusFilter}
                      counts={stageCounts}
                      placeholder="Search stages..."
                    />
                  </div>

                  {/* DnD stage list */}
                  <div className="px-2 pb-2 pt-1.5">
                    {filteredStages.length === 0 ? (
                      <div className="flex flex-col items-center py-4 text-muted-foreground">
                        <p className="text-[10px]">No stages match filter</p>
                      </div>
                    ) : (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(event) =>
                          handleDragEnd(
                            workflow.id,
                            filteredStages,
                            event
                          )
                        }
                      >
                        <SortableContext
                          items={filteredStages.map((s) => s.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="flex flex-col gap-1">
                            {filteredStages.map((stage) => (
                              <SortableStageItem
                                key={stage.id}
                                stage={stage}
                                isSelected={selectedStageId === stage.id}
                                onSelect={() =>
                                  onSelectStage(workflow.id, stage.id)
                                }
                                onRunStage={() =>
                                  onRunStage(workflow.id, stage.id)
                                }
                                isStageRunning={runningStages.includes(
                                  stage.id
                                )}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

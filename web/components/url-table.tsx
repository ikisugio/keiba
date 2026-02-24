"use client"

import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { ExternalLink, RotateCw, Search } from "lucide-react"
import type { ScrapeStatus, ScrapeJob } from "@/lib/scrape-types"
import { StatusBadge } from "@/components/status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const jobFilterOptions: { value: ScrapeStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
  { value: "running", label: "Running" },
  { value: "idle", label: "Idle" },
]

interface JobTableProps {
  jobs: (ScrapeJob & { _stageName?: string })[]
  onRescrape: (jobId: string) => void
  rescraping: string[]
  jobSearch: string
  onJobSearchChange: (query: string) => void
  jobStatusFilter: ScrapeStatus | "all"
  onJobStatusFilterChange: (status: ScrapeStatus | "all") => void
  onJobClick: (job: ScrapeJob) => void
  showStageColumn?: boolean
}

export function JobTable({
  jobs,
  onRescrape,
  rescraping,
  jobSearch,
  onJobSearchChange,
  jobStatusFilter,
  onJobStatusFilterChange,
  onJobClick,
  showStageColumn = false,
}: JobTableProps) {
  const jobCounts: Record<string, number> = {}
  for (const job of jobs) {
    jobCounts[job.status] = (jobCounts[job.status] ?? 0) + 1
  }

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      jobSearch === "" ||
      job.url.toLowerCase().includes(jobSearch.toLowerCase()) ||
      (job.errorMessage?.toLowerCase().includes(jobSearch.toLowerCase()) ?? false)
    const matchesStatus =
      jobStatusFilter === "all" || job.status === jobStatusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-3">
        {/* Filter bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            {jobFilterOptions.map((option) => {
              const count =
                option.value === "all"
                  ? jobs.length
                  : jobCounts[option.value] ?? 0
              return (
                <button
                  key={option.value}
                  onClick={() => onJobStatusFilterChange(option.value)}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
                    jobStatusFilter === option.value
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  {option.label}
                  <Badge
                    variant="secondary"
                    className="px-1.5 py-0 text-[10px] h-4 min-w-4 justify-center bg-secondary text-muted-foreground"
                  >
                    {count}
                  </Badge>
                </button>
              )
            })}
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search URLs..."
              value={jobSearch}
              onChange={(e) => onJobSearchChange(e.target.value)}
              className="pl-8 h-8 w-48 bg-secondary border-border text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                {showStageColumn && (
                  <TableHead className="text-muted-foreground font-medium">Stage</TableHead>
                )}
                <TableHead className="text-muted-foreground font-medium">URL</TableHead>
                <TableHead className="text-muted-foreground font-medium">Status</TableHead>
                <TableHead className="text-muted-foreground font-medium text-right">Code</TableHead>
                <TableHead className="text-muted-foreground font-medium text-right">Items</TableHead>
                <TableHead className="text-muted-foreground font-medium">Last Scraped</TableHead>
                <TableHead className="text-muted-foreground font-medium text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredJobs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={showStageColumn ? 7 : 6} className="text-center py-8 text-muted-foreground text-sm">
                    No jobs found matching filters
                  </TableCell>
                </TableRow>
              )}
              {filteredJobs.map((job) => {
                const isRescraping = rescraping.includes(job.id)
                return (
                  <TableRow
                    key={job.id}
                    className="border-border cursor-pointer hover:bg-accent/40 transition-colors"
                    onClick={() => onJobClick(job)}
                  >
                    {showStageColumn && (
                      <TableCell>
                        <span className="text-xs font-medium text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                          {(job as ScrapeJob & { _stageName?: string })._stageName ?? ""}
                        </span>
                      </TableCell>
                    )}
                    <TableCell className="max-w-[300px]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-foreground text-sm truncate font-mono">
                          {job.url.replace(/^https?:\/\//, "")}
                        </span>
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="size-3" />
                          <span className="sr-only">Open URL in new tab</span>
                        </a>
                      </div>
                      {job.errorMessage && (
                        <p className="text-xs text-destructive mt-0.5 truncate max-w-[280px]">
                          {job.errorMessage}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={job.status} />
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-muted-foreground">
                      {job.responseCode ?? "--"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-foreground">
                      {job.itemsCollected.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {job.lastScrapedAt
                        ? format(new Date(job.lastScrapedAt), "MM/dd HH:mm:ss", {
                            locale: ja,
                          })
                        : "--"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation()
                              onRescrape(job.id)
                            }}
                            disabled={isRescraping}
                          >
                            <RotateCw
                              className={`size-3.5 ${isRescraping ? "animate-spin" : ""}`}
                            />
                            <span className="sr-only">Re-scrape this URL</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Re-scrape</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </TooltipProvider>
  )
}

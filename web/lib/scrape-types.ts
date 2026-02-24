export type ScrapeStatus = "idle" | "running" | "success" | "failed" | "partial"

export interface LogEntry {
  id: string
  timestamp: string
  level: "info" | "warn" | "error" | "debug"
  message: string
}

export interface ScrapeJob {
  id: string
  url: string
  status: ScrapeStatus
  lastScrapedAt: string | null
  responseCode: number | null
  itemsCollected: number
  errorMessage: string | null
  logs: LogEntry[]
}

export interface ScrapeStage {
  id: string
  name: string
  description: string
  status: ScrapeStatus
  order: number
  jobs: ScrapeJob[]
  logs: LogEntry[]
  totalItems: number
  successRate: number
}

export interface ScrapeWorkflow {
  id: string
  name: string
  description: string
  status: ScrapeStatus
  createdAt: string
  lastRunAt: string | null
  schedule: string | null
  stages: ScrapeStage[]
  logs: LogEntry[]
  totalItems: number
  successRate: number
}

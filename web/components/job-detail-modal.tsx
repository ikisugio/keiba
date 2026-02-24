"use client"

import { useState, useRef, useCallback, useEffect, useMemo } from "react"
import { format, formatDistanceToNow } from "date-fns"
import { ja } from "date-fns/locale"
import {
  ExternalLink,
  RotateCw,
  Clock,
  Hash,
  BarChart3,
  AlertTriangle,
  Search,
} from "lucide-react"
import type { ScrapeJob, LogEntry } from "@/lib/scrape-types"
import { StatusBadge } from "@/components/status-badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Kbd } from "@/components/ui/kbd"
import { cn, responseCodeColor } from "@/lib/utils"

interface JobDetailModalProps {
  job: ScrapeJob | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRescrape: (jobId: string) => void
  isRescraping: boolean
}

const MIN_W = 560
const MIN_H = 400
const DEFAULT_W = 900
const DEFAULT_H = 660

type LogLevel = LogEntry["level"]

const levelStyles: Record<LogLevel, string> = {
  info: "text-info",
  warn: "text-warning",
  error: "text-destructive",
  debug: "text-muted-foreground",
}

const levelActiveStyles: Record<LogLevel, string> = {
  info: "bg-info/15 text-info border-info/30",
  warn: "bg-warning/15 text-warning border-warning/30",
  error: "bg-destructive/15 text-destructive border-destructive/30",
  debug: "bg-muted/30 text-muted-foreground border-muted-foreground/30",
}

const levelLabels: Record<LogLevel, string> = {
  info: "INFO",
  warn: "WARN",
  error: "ERR ",
  debug: "DBG ",
}

const ALL_FILTERS: (LogLevel | "all")[] = ["all", "info", "warn", "error", "debug"]

// --- search helpers (always regex) ---
function buildSearchRegex(query: string): { regex: RegExp | null; error: string | null } {
  if (!query.trim()) return { regex: null, error: null }
  try {
    return { regex: new RegExp(query, "gi"), error: null }
  } catch (e) {
    return { regex: null, error: (e as Error).message }
  }
}

function testSearch(regex: RegExp | null, text: string): boolean {
  if (!regex) return true
  regex.lastIndex = 0
  return regex.test(text)
}

function HighlightedText({ text, regex }: { text: string; regex: RegExp | null }) {
  if (!regex) return <>{text}</>

  const globalRegex = new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : regex.flags + "g")
  const result: React.ReactNode[] = []
  let lastIndex = 0

  globalRegex.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = globalRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push(<span key={`t${lastIndex}`}>{text.slice(lastIndex, match.index)}</span>)
    }
    result.push(
      <mark key={`m${match.index}`} className="bg-primary/30 text-primary rounded-xs px-0.5">{match[0]}</mark>
    )
    lastIndex = match.index + match[0].length
    if (match.index === globalRegex.lastIndex) globalRegex.lastIndex++
  }

  if (lastIndex < text.length) {
    result.push(<span key={`t${lastIndex}`}>{text.slice(lastIndex)}</span>)
  }

  return result.length > 0 ? <>{result}</> : <>{text}</>
}

export function JobDetailModal({
  job,
  open,
  onOpenChange,
  onRescrape,
  isRescraping,
}: JobDetailModalProps) {
  const [size, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H })
  const [isResizing, setIsResizing] = useState(false)
  const [logLevelFilter, setLogLevelFilter] = useState<LogLevel | "all">("all")
  const [logSearch, setLogSearch] = useState("")

  type Edge = "left" | "right" | "top" | "bottom" | "top-left" | "top-right" | "bottom-left" | "bottom-right"
  const startRef = useRef({ x: 0, y: 0, w: 0, h: 0, edge: "" as Edge })
  const logBottomRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setSize({ w: DEFAULT_W, h: DEFAULT_H })
      setIsResizing(false)
      setLogLevelFilter("all")
      setLogSearch("")
    }
  }, [open])

  // --- keyboard shortcuts ---
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      // / to focus search (when not already in an input)
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName ?? "")) {
        e.preventDefault()
        searchInputRef.current?.focus()
        return
      }
      // Tab / Shift+Tab to cycle log level (when not in input)
      if (e.key === "Tab" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName ?? "")) {
        e.preventDefault()
        const currentIdx = ALL_FILTERS.indexOf(logLevelFilter)
        if (e.shiftKey) {
          const prevIdx = (currentIdx - 1 + ALL_FILTERS.length) % ALL_FILTERS.length
          setLogLevelFilter(ALL_FILTERS[prevIdx])
        } else {
          const nextIdx = (currentIdx + 1) % ALL_FILTERS.length
          setLogLevelFilter(ALL_FILTERS[nextIdx])
        }
        return
      }
      // Ctrl+Enter to rescrape
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        if (job && !isRescraping) onRescrape(job.id)
        return
      }
      // Escape in search returns focus to dialog
      if (e.key === "Escape" && (e.target as HTMLElement) === searchInputRef.current) {
        e.preventDefault()
        e.stopPropagation()
        searchInputRef.current?.blur()
        dialogRef.current?.focus()
        return
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, logLevelFilter, job, isRescraping, onRescrape])

  // --- log filtering ---
  const { regex: searchRegex, error: regexError } = useMemo(
    () => buildSearchRegex(logSearch),
    [logSearch]
  )

  const logCounts = useMemo(() => {
    if (!job) return { info: 0, warn: 0, error: 0, debug: 0, all: 0 }
    const counts = { info: 0, warn: 0, error: 0, debug: 0, all: job.logs.length }
    for (const l of job.logs) counts[l.level]++
    return counts
  }, [job])

  const filteredLogs = useMemo(() => {
    if (!job) return []
    return job.logs.filter((l) => {
      if (logLevelFilter !== "all" && l.level !== logLevelFilter) return false
      if (logSearch && !testSearch(searchRegex, l.message)) return false
      return true
    })
  }, [job, logLevelFilter, logSearch, searchRegex])

  useEffect(() => {
    logBottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [filteredLogs.length])

  // --- resize ---
  const cursorForEdge = (edge: Edge) => {
    switch (edge) {
      case "left": case "right": return "ew-resize"
      case "top": case "bottom": return "ns-resize"
      case "top-left": case "bottom-right": return "nwse-resize"
      case "top-right": case "bottom-left": return "nesw-resize"
    }
  }

  const startResize = useCallback(
    (e: React.MouseEvent, edge: Edge) => {
      e.preventDefault()
      e.stopPropagation()
      startRef.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h, edge }
      setIsResizing(true)
      document.body.style.cursor = cursorForEdge(edge)
      document.body.style.userSelect = "none"

      const onMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startRef.current.x
        const dy = ev.clientY - startRef.current.y
        const s = startRef.current
        let newW = s.w
        let newH = s.h
        if (["right", "top-right", "bottom-right"].includes(s.edge)) newW = s.w + dx * 2
        if (["left", "top-left", "bottom-left"].includes(s.edge)) newW = s.w - dx * 2
        if (["bottom", "bottom-left", "bottom-right"].includes(s.edge)) newH = s.h + dy * 2
        if (["top", "top-left", "top-right"].includes(s.edge)) newH = s.h - dy * 2
        setSize({
          w: Math.max(MIN_W, Math.min(newW, window.innerWidth - 40)),
          h: Math.max(MIN_H, Math.min(newH, window.innerHeight - 40)),
        })
      }

      const onUp = () => {
        setIsResizing(false)
        document.body.style.cursor = ""
        document.body.style.userSelect = ""
        document.removeEventListener("mousemove", onMove)
        document.removeEventListener("mouseup", onUp)
      }

      document.addEventListener("mousemove", onMove)
      document.addEventListener("mouseup", onUp)
    },
    [size]
  )

  if (!job) return null

  const shortUrl = job.url.replace(/^https?:\/\//, "")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={dialogRef}
        className="bg-card text-foreground flex flex-col overflow-hidden !translate-x-[-50%] !translate-y-[-50%] transition-[border-color] duration-150"
        style={{
          maxWidth: size.w,
          width: "calc(100% - 2rem)",
          height: size.h,
          maxHeight: "calc(100vh - 2rem)",
          borderColor: isResizing ? "var(--primary)" : undefined,
          boxShadow: isResizing
            ? "0 0 0 1px var(--primary), 0 25px 50px -12px rgba(0,0,0,.25)"
            : undefined,
        }}
      >
        {/* Resize handles - edges */}
        <div onMouseDown={(e) => startResize(e, "left")} className="absolute top-2 left-0 w-2 h-[calc(100%-16px)] cursor-ew-resize z-20 group">
          <div className="absolute top-1/2 -translate-y-1/2 left-0 w-0.5 h-10 rounded-full bg-transparent group-hover:bg-primary/50 transition-colors" />
        </div>
        <div onMouseDown={(e) => startResize(e, "right")} className="absolute top-2 right-0 w-2 h-[calc(100%-16px)] cursor-ew-resize z-20 group">
          <div className="absolute top-1/2 -translate-y-1/2 right-0 w-0.5 h-10 rounded-full bg-transparent group-hover:bg-primary/50 transition-colors" />
        </div>
        <div onMouseDown={(e) => startResize(e, "top")} className="absolute top-0 left-2 h-2 w-[calc(100%-16px)] cursor-ns-resize z-20 group">
          <div className="absolute left-1/2 -translate-x-1/2 top-0 h-0.5 w-10 rounded-full bg-transparent group-hover:bg-primary/50 transition-colors" />
        </div>
        <div onMouseDown={(e) => startResize(e, "bottom")} className="absolute bottom-0 left-2 h-2 w-[calc(100%-16px)] cursor-ns-resize z-20 group">
          <div className="absolute left-1/2 -translate-x-1/2 bottom-0 h-0.5 w-10 rounded-full bg-transparent group-hover:bg-primary/50 transition-colors" />
        </div>
        {/* Resize handles - corners */}
        <div onMouseDown={(e) => startResize(e, "top-left")} className="absolute top-0 left-0 w-3 h-3 cursor-nwse-resize z-30" />
        <div onMouseDown={(e) => startResize(e, "top-right")} className="absolute top-0 right-0 w-3 h-3 cursor-nesw-resize z-30" />
        <div onMouseDown={(e) => startResize(e, "bottom-left")} className="absolute bottom-0 left-0 w-3 h-3 cursor-nesw-resize z-30" />
        <div onMouseDown={(e) => startResize(e, "bottom-right")} className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-30 group">
          <svg viewBox="0 0 16 16" className="size-3 absolute bottom-1 right-1 text-muted-foreground/40 group-hover:text-primary/60 transition-colors">
            <path d="M14 14L8 14M14 14L14 8M14 14L5 5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </svg>
        </div>

        {/* ====== FIXED HEADER ====== */}
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-3 text-base font-semibold pr-8">
            <span className="font-mono text-sm truncate">{shortUrl}</span>
            <StatusBadge status={job.status} />
          </DialogTitle>
        </DialogHeader>

        {/* Stats grid -- fixed */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 shrink-0">
          <div className="rounded-lg border border-border bg-secondary/50 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Hash className="size-3" />
              Response Code
            </div>
            <div className="text-lg font-semibold font-mono text-foreground">
              {job.responseCode ?? "--"}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-secondary/50 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <BarChart3 className="size-3" />
              Items Collected
            </div>
            <div className="text-lg font-semibold font-mono text-foreground">
              {job.itemsCollected.toLocaleString()}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-secondary/50 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Clock className="size-3" />
              Last Scraped
            </div>
            <div className="text-sm font-medium text-foreground">
              {job.lastScrapedAt
                ? formatDistanceToNow(new Date(job.lastScrapedAt), {
                    addSuffix: true,
                    locale: ja,
                  })
                : "--"}
            </div>
            {job.lastScrapedAt && (
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {format(new Date(job.lastScrapedAt), "yyyy/MM/dd HH:mm:ss", { locale: ja })}
              </div>
            )}
          </div>
          <div className="rounded-lg border border-border bg-secondary/50 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <ExternalLink className="size-3" />
              Full URL
            </div>
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-info hover:underline break-all line-clamp-3 cursor-pointer"
            >
              {job.url}
            </a>
          </div>
        </div>

        {/* Error message -- fixed */}
        {job.errorMessage && (
          <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 p-3 shrink-0">
            <AlertTriangle className="size-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-destructive mb-0.5">Error</p>
              <p className="text-xs text-destructive/80">{job.errorMessage}</p>
            </div>
          </div>
        )}

        {/* ====== LOG SECTION ====== */}
        <div className="flex-1 min-h-0 flex flex-col gap-2">
          {/* Log toolbar -- fixed */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider shrink-0">
              Logs
            </h4>

            {/* Level filter badges */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setLogLevelFilter("all")}
                className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer border outline-none",
                  logLevelFilter === "all"
                    ? "bg-primary/15 text-primary border-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50 border-transparent"
                )}
              >
                <span className="text-primary font-semibold">All</span>
                <span className="font-mono opacity-70">{logCounts.all}</span>
              </button>
              {(["info", "warn", "error", "debug"] as LogLevel[]).map((level) => (
                <button
                  key={level}
                  onClick={() =>
                    setLogLevelFilter((cur) => (cur === level ? "all" : level))
                  }
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer border outline-none",
                    logLevelFilter === level
                      ? levelActiveStyles[level]
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50 border-transparent"
                  )}
                >
                  <span className={cn("font-semibold", logLevelFilter === level ? "" : levelStyles[level])}>
                    {level.toUpperCase()}
                  </span>
                  <span className="font-mono opacity-70">{logCounts[level]}</span>
                </button>
              ))}

              <Kbd className="ml-1 text-[9px] opacity-60">Tab</Kbd>
            </div>

            {/* Search (regex supported) */}
            <div className="relative ml-auto flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-muted-foreground/50">regex</span>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground pointer-events-none" />
                <Input
                  ref={searchInputRef}
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="Search logs..."
                  className={cn(
                    "h-6 w-48 pl-7 pr-8 text-xs border-border font-mono bg-secondary",
                    regexError && "border-destructive/50 text-destructive"
                  )}
                />
                <Kbd className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] opacity-60">/</Kbd>
              </div>
              {regexError && (
                <span className="text-[9px] text-destructive font-mono max-w-[100px] truncate" title={regexError}>
                  invalid
                </span>
              )}
            </div>
          </div>

          {/* Log list -- scrollable */}
          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full rounded-md border border-border bg-background outline-none [&>div]:outline-none">
              <div className="p-3 font-mono text-xs leading-relaxed">
                {filteredLogs.length === 0 ? (
                  <div className="flex items-center justify-center h-20 text-muted-foreground text-xs">
                    {job.logs.length === 0 ? "No log entries yet" : "No logs match filter"}
                  </div>
                ) : (
                  filteredLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex gap-3 py-0.5 hover:bg-accent/30 px-1 rounded-sm"
                    >
                      <span className="text-muted-foreground shrink-0">
                        {format(new Date(log.timestamp), "HH:mm:ss")}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 font-semibold w-10",
                          levelStyles[log.level]
                        )}
                      >
                        {levelLabels[log.level]}
                      </span>
                      <span className="text-foreground break-all">
                        <HighlightedText text={log.message} regex={searchRegex} />
                      </span>
                    </div>
                  ))
                )}
                <div ref={logBottomRef} />
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* ====== FIXED FOOTER ====== */}
        <div className="flex items-center justify-between pt-3 border-t border-border shrink-0">
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Kbd className="text-[9px]">/</Kbd>
              <span>Search</span>
            </span>
            <span className="flex items-center gap-1">
              <Kbd className="text-[9px]">Tab</Kbd>
              /
              <Kbd className="text-[9px]">Shift+Tab</Kbd>
              <span>Level</span>
            </span>
            <span className="flex items-center gap-1">
              <Kbd className="text-[9px]">Esc</Kbd>
              <span>Close search</span>
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-foreground border-border hover:bg-accent cursor-pointer"
            onClick={() => onRescrape(job.id)}
            disabled={isRescraping}
          >
            <RotateCw className={`size-3.5 ${isRescraping ? "animate-spin" : ""}`} />
            {isRescraping ? "Re-scraping..." : "Re-scrape"}
            <Kbd className="ml-1 text-[9px]">Ctrl+Enter</Kbd>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

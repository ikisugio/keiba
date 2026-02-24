"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { format, formatDistanceToNow } from "date-fns"
import { ja } from "date-fns/locale"
import {
  ExternalLink,
  RotateCw,
  Clock,
  Hash,
  BarChart3,
  AlertTriangle,
} from "lucide-react"
import type { ScrapeJob } from "@/lib/scrape-types"
import { StatusBadge } from "@/components/status-badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { LogViewer } from "@/components/log-viewer"
import { cn } from "@/lib/utils"

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


export function JobDetailModal({
  job,
  open,
  onOpenChange,
  onRescrape,
  isRescraping,
}: JobDetailModalProps) {
  const [size, setSize] = useState(() => {
    if (typeof window === "undefined") return { w: DEFAULT_W, h: DEFAULT_H }
    try {
      const saved = localStorage.getItem("job-modal-size")
      if (saved) {
        const { w, h } = JSON.parse(saved)
        return {
          w: Math.min(Math.max(Number(w), MIN_W), window.innerWidth - 40),
          h: Math.min(Math.max(Number(h), MIN_H), window.innerHeight - 40),
        }
      }
    } catch {}
    return { w: DEFAULT_W, h: DEFAULT_H }
  })
  const [isResizing, setIsResizing] = useState(false)

  type Edge = "left" | "right" | "top" | "bottom" | "top-left" | "top-right" | "bottom-left" | "bottom-right"
  const startRef = useRef({ x: 0, y: 0, w: 0, h: 0, edge: "" as Edge })
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) setIsResizing(false)
  }, [open])

  // Ctrl+Enter to rescrape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        if (job && !isRescraping) onRescrape(job.id)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, job, isRescraping, onRescrape])

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
        setSize((prev) => {
          localStorage.setItem("job-modal-size", JSON.stringify(prev))
          return prev
        })
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
        <LogViewer
          key={job.id}
          logs={job.logs}
          shortcutsEnabled={open}
          className="flex-1 min-h-0"
        />

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

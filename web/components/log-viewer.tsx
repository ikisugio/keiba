"use client"

import { useRef, useEffect } from "react"
import { format } from "date-fns"
import type { LogEntry } from "@/lib/scrape-types"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

const levelStyles: Record<LogEntry["level"], string> = {
  info: "text-info",
  warn: "text-warning",
  error: "text-destructive",
  debug: "text-muted-foreground",
}

const levelLabels: Record<LogEntry["level"], string> = {
  info: "INFO",
  warn: "WARN",
  error: "ERR ",
  debug: "DBG ",
}

interface LogViewerProps {
  logs: LogEntry[]
}

export function LogViewer({ logs }: LogViewerProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logs.length])

  if (logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        No log entries yet
      </div>
    )
  }

  return (
    <ScrollArea className="h-72 rounded-md border border-border bg-background">
      <div className="p-3 font-mono text-xs leading-relaxed">
        {logs.map((log) => (
          <div key={log.id} className="flex gap-3 py-0.5 hover:bg-accent/30 px-1 rounded-sm">
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
            <span className="text-foreground break-all">{log.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  )
}

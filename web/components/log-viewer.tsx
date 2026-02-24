"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { format } from "date-fns"
import { Search } from "lucide-react"
import type { LogEntry } from "@/lib/scrape-types"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"
import { cn } from "@/lib/utils"

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

interface LogViewerProps {
  logs: LogEntry[]
  /** Additional classes for the outer container (e.g. "flex-1 min-h-0" inside a modal) */
  className?: string
  /** Enable keyboard shortcuts: / to focus search, Tab/Shift+Tab to cycle level */
  shortcutsEnabled?: boolean
}

export function LogViewer({ logs, className, shortcutsEnabled = false }: LogViewerProps) {
  const [logLevelFilter, setLogLevelFilter] = useState<LogLevel | "all">("all")
  const [logSearch, setLogSearch] = useState("")
  const searchInputRef = useRef<HTMLInputElement>(null)
  const logBottomRef = useRef<HTMLDivElement>(null)

  const { regex: searchRegex, error: regexError } = useMemo(
    () => buildSearchRegex(logSearch),
    [logSearch]
  )

  const logCounts = useMemo(() => {
    const counts = { info: 0, warn: 0, error: 0, debug: 0, all: logs.length }
    for (const l of logs) counts[l.level]++
    return counts
  }, [logs])

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (logLevelFilter !== "all" && l.level !== logLevelFilter) return false
      if (logSearch && !testSearch(searchRegex, l.message)) return false
      return true
    })
  }, [logs, logLevelFilter, logSearch, searchRegex])

  useEffect(() => {
    logBottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [filteredLogs.length])

  useEffect(() => {
    if (!shortcutsEnabled) return
    const handler = (e: KeyboardEvent) => {
      const inInput = ["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName ?? "")
      if (e.key === "/" && !inInput) {
        e.preventDefault()
        searchInputRef.current?.focus()
        return
      }
      if (e.key === "Tab" && !inInput) {
        e.preventDefault()
        const idx = ALL_FILTERS.indexOf(logLevelFilter)
        setLogLevelFilter(
          e.shiftKey
            ? ALL_FILTERS[(idx - 1 + ALL_FILTERS.length) % ALL_FILTERS.length]
            : ALL_FILTERS[(idx + 1) % ALL_FILTERS.length]
        )
        return
      }
      if (e.key === "Escape" && (e.target as HTMLElement) === searchInputRef.current) {
        e.preventDefault()
        e.stopPropagation()
        searchInputRef.current?.blur()
        return
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [shortcutsEnabled, logLevelFilter])

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap shrink-0">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider shrink-0">
          Logs
        </h4>
        {/* Level filter */}
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
              onClick={() => setLogLevelFilter((cur) => (cur === level ? "all" : level))}
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
          {shortcutsEnabled && <Kbd className="ml-1 text-[9px] opacity-60">Tab</Kbd>}
        </div>
        {/* Search */}
        <div className="ml-auto flex items-center gap-1.5">
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
            {shortcutsEnabled && (
              <Kbd className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] opacity-60">/</Kbd>
            )}
          </div>
          {regexError && (
            <span className="text-[9px] text-destructive font-mono max-w-[100px] truncate" title={regexError}>
              invalid
            </span>
          )}
        </div>
      </div>

      {/* Log list */}
      <div className="flex-1" style={{ minHeight: "288px" }}>
        <ScrollArea className="h-full rounded-md border border-border bg-background outline-none [&>div]:outline-none">
          <div className="p-3 font-mono text-xs leading-relaxed">
            {filteredLogs.length === 0 ? (
              <div className="flex items-center justify-center h-20 text-muted-foreground text-xs">
                {logs.length === 0 ? "No log entries yet" : "No logs match filter"}
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div key={log.id} className="flex gap-3 py-0.5 hover:bg-accent/30 px-1 rounded-sm">
                  <span className="text-muted-foreground shrink-0">
                    {format(new Date(log.timestamp), "HH:mm:ss")}
                  </span>
                  <span className={cn("shrink-0 font-semibold w-10", levelStyles[log.level])}>
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
  )
}

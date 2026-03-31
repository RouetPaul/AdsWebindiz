"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { cn } from "@/lib/utils";

interface SyncLogEntry {
  id: number;
  startedAt: string;
  completedAt: string | null;
  status: "running" | "completed" | "failed";
  accountsSynced: number;
  error: string | null;
}

interface SyncStep {
  id: number;
  syncId: number;
  timestamp: string;
  level: "info" | "success" | "warn" | "error";
  message: string;
  detail: string | null;
}

const LEVEL_STYLES: Record<string, string> = {
  info: "text-zinc-400",
  success: "text-emerald-400",
  warn: "text-amber-400",
  error: "text-red-400",
};

const LEVEL_DOT: Record<string, string> = {
  info: "bg-zinc-500",
  success: "bg-emerald-500",
  warn: "bg-amber-500",
  error: "bg-red-500",
};

const STATUS_BADGE: Record<string, string> = {
  running: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  failed: "bg-red-500/15 text-red-400 border-red-500/30",
};

export default function SyncLogsPage() {
  const [logs, setLogs] = useState<SyncLogEntry[]>([]);
  const [selectedSync, setSelectedSync] = useState<number | null>(null);
  const [steps, setSteps] = useState<SyncStep[]>([]);
  const [selectedLog, setSelectedLog] = useState<SyncLogEntry | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    const res = await fetch("/api/sync/logs");
    const data = await res.json();
    setLogs(data.logs ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!selectedSync) {
      setSteps([]);
      setSelectedLog(null);
      return;
    }

    let interval: ReturnType<typeof setInterval>;

    async function fetchSteps() {
      const res = await fetch(`/api/sync/logs?syncId=${selectedSync}`);
      const data = await res.json();
      setSteps(data.steps ?? []);
      setSelectedLog(data.log ?? null);

      // If still running, poll
      if (data.log?.status === "running") {
        interval = setInterval(async () => {
          const r = await fetch(`/api/sync/logs?syncId=${selectedSync}`);
          const d = await r.json();
          setSteps(d.steps ?? []);
          setSelectedLog(d.log ?? null);
          if (d.log?.status !== "running") clearInterval(interval);
        }, 2000);
      }
    }

    fetchSteps();
    return () => clearInterval(interval);
  }, [selectedSync]);

  function formatTime(ts: string) {
    return new Date(ts).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function formatDuration(start: string, end: string | null) {
    if (!end) return "en cours...";
    const ms = new Date(end).getTime() - new Date(start).getTime();
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  return (
    <div className="flex flex-col">
      <Header title="Sync Logs" />

      <div className="flex gap-6 p-8">
        {/* Left: sync list */}
        <div className="w-80 shrink-0 space-y-2">
          <h2 className="mb-3 text-sm font-medium text-zinc-400">Historique des syncs</h2>
          {loading ? (
            <p className="text-sm text-zinc-500">Chargement...</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-zinc-500">Aucune sync effectuée</p>
          ) : (
            logs.map((log) => (
              <button
                key={log.id}
                onClick={() => setSelectedSync(log.id)}
                className={cn(
                  "w-full rounded-lg border p-3 text-left transition-colors",
                  selectedSync === log.id
                    ? "border-blue-500/40 bg-blue-500/10"
                    : "border-white/10 bg-zinc-900/50 hover:border-white/20",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">#{log.id}</span>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                      STATUS_BADGE[log.status],
                    )}
                  >
                    {log.status === "running" && "● "}
                    {log.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-300">{formatTime(log.startedAt)}</p>
                <div className="mt-1 flex justify-between text-[10px] text-zinc-500">
                  <span>{log.accountsSynced} compte(s)</span>
                  <span>{formatDuration(log.startedAt, log.completedAt)}</span>
                </div>
                {log.error && (
                  <p className="mt-1 truncate text-[10px] text-red-400">{log.error}</p>
                )}
              </button>
            ))
          )}
        </div>

        {/* Right: log detail */}
        <div className="flex-1">
          {!selectedSync ? (
            <div className="flex h-64 items-center justify-center rounded-xl border border-white/10 bg-zinc-900/30">
              <p className="text-sm text-zinc-500">Sélectionnez une sync pour voir les logs</p>
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-zinc-900/30">
              {/* Header */}
              {selectedLog && (
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-medium text-white">Sync #{selectedLog.id}</h3>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                        STATUS_BADGE[selectedLog.status],
                      )}
                    >
                      {selectedLog.status}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-500">
                    {formatDuration(selectedLog.startedAt, selectedLog.completedAt)}
                  </span>
                </div>
              )}

              {/* Steps */}
              <div className="max-h-[600px] overflow-y-auto p-4 font-mono text-xs">
                {steps.length === 0 ? (
                  <p className="text-zinc-500">Aucun log pour cette sync</p>
                ) : (
                  <div className="space-y-1">
                    {steps.map((step) => (
                      <div key={step.id} className="group flex gap-3">
                        <span className="w-16 shrink-0 text-zinc-600">
                          {new Date(step.timestamp).toLocaleTimeString("fr-FR", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                        <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", LEVEL_DOT[step.level])} />
                        <div className="min-w-0">
                          <span className={LEVEL_STYLES[step.level]}>{step.message}</span>
                          {step.detail && (
                            <p className="mt-0.5 truncate text-zinc-600 group-hover:whitespace-normal">
                              {step.detail}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    {selectedLog?.status === "running" && (
                      <div className="flex items-center gap-2 pl-[76px] text-blue-400">
                        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                        En cours...
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

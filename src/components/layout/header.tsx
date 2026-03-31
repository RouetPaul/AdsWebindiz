"use client";

import { useState } from "react";
import { timeAgo } from "@/lib/utils";

interface HeaderProps {
  title: string;
  lastSyncedAt?: string | null;
}

export function Header({ title, lastSyncedAt }: HeaderProps) {
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setToast(null);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "x-manual-sync": "1" },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Sync failed");
      }
      setToast("Sync terminée avec succès");
      // Reload page to show fresh data
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Erreur de sync");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <header className="flex items-center justify-between border-b border-white/10 bg-zinc-950/80 px-8 py-4 backdrop-blur-sm">
      <div>
        <h1 className="text-xl font-semibold text-white">{title}</h1>
        {lastSyncedAt && (
          <p className="mt-0.5 text-xs text-zinc-500">
            Dernière sync : {timeAgo(lastSyncedAt)}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
        >
          {syncing ? "Sync en cours..." : "Sync manuelle"}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </header>
  );
}

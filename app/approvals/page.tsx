"use client";

import { useEffect, useState, useCallback } from "react";

interface ApprovalLog {
  id: string;
  eventType: string;
  actionDescription: string;
  proposedChanges: string | null;
  autoExecuted: boolean;
  createdAt: string;
  task?: { id: string; title: string } | null;
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchApprovals = useCallback(async () => {
    const res = await fetch("/api/logs?type=APPROVAL_REQUEST&pending=true");
    if (res.ok) setApprovals(await res.json());
  }, []);

  useEffect(() => {
    fetchApprovals().finally(() => setLoading(false));
  }, [fetchApprovals]);

  const handleAction = async (logId: string, action: "approve" | "dismiss") => {
    setProcessing(logId);
    try {
      await fetch(`/api/approvals/${logId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await fetchApprovals();
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Pending Approvals
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          The agent drafted these actions and needs your review before executing
          them.
        </p>
      </div>

      {approvals.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center dark:border-gray-600">
          <p className="text-gray-500 dark:text-gray-400">
            No pending approvals. The agent is handling everything autonomously!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {approvals.map((approval) => {
            let parsedChanges: Record<string, unknown> | null = null;
            try {
              if (approval.proposedChanges) {
                parsedChanges = JSON.parse(approval.proposedChanges);
              }
            } catch {
              // ignore parse errors
            }

            return (
              <div
                key={approval.id}
                className="rounded-lg border border-yellow-200 bg-yellow-50 p-5 dark:border-yellow-800 dark:bg-yellow-900/20"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">⚠️</span>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        Approval Required
                      </h3>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                      {approval.actionDescription}
                    </p>
                    {parsedChanges && (
                      <details className="mb-3">
                        <summary className="cursor-pointer text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700">
                          View proposed changes
                        </summary>
                        <pre className="mt-2 rounded bg-gray-100 p-3 text-xs overflow-x-auto dark:bg-gray-800 dark:text-gray-300">
                          {JSON.stringify(parsedChanges, null, 2)}
                        </pre>
                      </details>
                    )}
                    {approval.task && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Related task: {approval.task.title}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(approval.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleAction(approval.id, "approve")}
                      disabled={processing === approval.id}
                      className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {processing === approval.id ? "..." : "Approve"}
                    </button>
                    <button
                      onClick={() => handleAction(approval.id, "dismiss")}
                      disabled={processing === approval.id}
                      className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

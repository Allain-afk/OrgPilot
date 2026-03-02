"use client";

const eventTypeIcons: Record<string, string> = {
  INGEST_EVENT: "📥",
  TASK_UPDATE: "✏️",
  NOTIFICATION: "🔔",
  APPROVAL_REQUEST: "⚠️",
};

interface LogEntry {
  id: string;
  eventType: string;
  actionDescription: string;
  autoExecuted: boolean;
  createdAt: string;
  task?: { id: string; title: string } | null;
}

interface LogFeedProps {
  logs: LogEntry[];
}

export function LogFeed({ logs }: LogFeedProps) {
  if (logs.length === 0) {
    return (
      <div className="text-center text-sm text-gray-400 py-8">
        No agent activity yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div
          key={log.id}
          className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="flex items-start gap-2">
            <span className="text-base">
              {eventTypeIcons[log.eventType] ?? "📋"}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-800 dark:text-gray-200">
                {log.actionDescription}
              </p>
              <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <time>
                  {new Date(log.createdAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
                {log.task && (
                  <>
                    <span>•</span>
                    <span className="truncate">{log.task.title}</span>
                  </>
                )}
                {!log.autoExecuted && (
                  <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                    Pending
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

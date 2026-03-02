"use client";

import { useEffect, useState, useCallback } from "react";
import { TaskTable } from "./components/TaskTable";
import { LogFeed } from "./components/LogFeed";

interface TaskOwner {
  id: string;
  name: string;
  role: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  priority: string;
  owner: TaskOwner | null;
  dueDate: string | null;
  sourceSystem: string;
  createdAt: string;
}

interface LogEntry {
  id: string;
  eventType: string;
  actionDescription: string;
  autoExecuted: boolean;
  createdAt: string;
  task?: { id: string; title: string } | null;
}

const TASK_TYPES = ["", "EVENT_REQUEST", "FACILITY_ISSUE", "FINANCE_REQUEST", "MEMBERSHIP", "FEEDBACK_OR_COMPLAINT", "OTHER"];
const TASK_STATUSES = [
  "",
  "NEW",
  "IN_PROGRESS",
  "BLOCKED",
  "DONE",
  "CANCELLED",
];

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    if (filterType) params.set("type", filterType);
    const res = await fetch(`/api/tasks?${params.toString()}`);
    if (res.ok) setTasks(await res.json());
  }, [filterStatus, filterType]);

  const fetchLogs = useCallback(async () => {
    const res = await fetch("/api/logs?limit=20");
    if (res.ok) setLogs(await res.json());
  }, []);

  useEffect(() => {
    Promise.all([fetchTasks(), fetchLogs()]).finally(() => setLoading(false));
  }, [fetchTasks, fetchLogs]);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      await Promise.all([fetchTasks(), fetchLogs()]);
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Ops Board
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {tasks.length} task{tasks.length !== 1 ? "s" : ""} tracked by
          OrgPilot
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Task board */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <div className="flex gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            >
              <option value="">All Statuses</option>
              {TASK_STATUSES.filter(Boolean).map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            >
              <option value="">All Types</option>
              {TASK_TYPES.filter(Boolean).map((t) => (
                <option key={t} value={t}>
                  {t.replace("_", " ")}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setFilterStatus("");
                setFilterType("");
              }}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Clear
            </button>

            <button
              onClick={() => Promise.all([fetchTasks(), fetchLogs()])}
              className="ml-auto rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Refresh
            </button>
          </div>

          <TaskTable tasks={tasks} onStatusChange={handleStatusChange} />
        </div>

        {/* Right: Agent activity log */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Agent Activity
          </h2>
          <LogFeed logs={logs} />
        </div>
      </div>
    </div>
  );
}

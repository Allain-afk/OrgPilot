"use client";

import { StatusBadge } from "./StatusBadge";
import { PriorityBadge } from "./PriorityBadge";

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
  section: string | null;
  status: string;
  priority: string;
  owner: TaskOwner | null;
  dueDate: string | null;
  sourceSystem: string;
  createdAt: string;
}

const STATUSES = ["NEW", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"];

const sectionColors: Record<string, string> = {
  NEWS: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  FEATURES: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  OPINION: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  SPORTS: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  LIFESTYLE: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
  PHOTOGRAPHY: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
  LAYOUT: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
};

interface TaskTableProps {
  tasks: Task[];
  onStatusChange: (taskId: string, newStatus: string) => void;
}

export function TaskTable({ tasks, onStatusChange }: TaskTableProps) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500 dark:border-gray-600 dark:text-gray-400">
        No tasks found. Trigger a webhook to create one!
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Title
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Section
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Priority
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Owner
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Due Date
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
          {tasks.map((task) => (
            <tr
              key={task.id}
              className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <td className="px-4 py-3">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {task.title}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                  {task.description}
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                  {task.type.replace(/_/g, " ")}
                </span>
              </td>
              <td className="px-4 py-3">
                {task.section ? (
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${sectionColors[task.section] ?? sectionColors.NEWS}`}
                  >
                    {task.section}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <select
                  value={task.status}
                  onChange={(e) => onStatusChange(task.id, e.target.value)}
                  className="rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace("_", " ")}
                    </option>
                  ))}
                </select>
                <div className="mt-1">
                  <StatusBadge status={task.status} />
                </div>
              </td>
              <td className="px-4 py-3">
                <PriorityBadge priority={task.priority} />
              </td>
              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                {task.owner ? (
                  <div>
                    <div className="font-medium">{task.owner.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {task.owner.role.replace(/_/g, " ")}
                    </div>
                  </div>
                ) : (
                  <span className="text-gray-400 italic">Unassigned</span>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                {task.dueDate
                  ? new Date(task.dueDate).toLocaleDateString()
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

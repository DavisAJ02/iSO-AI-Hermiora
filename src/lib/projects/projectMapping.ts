import type { Project, ProjectStatus } from "@/lib/types";

export type ProjectRow = {
  id: string;
  title: string | null;
  idea: string | null;
  status: string | null;
  progress: number | null;
  video_url?: string | null;
  created_at: string;
};

const gradients = [
  "from-violet-500 via-fuchsia-500 to-pink-500",
  "from-sky-600 via-blue-700 to-indigo-900",
  "from-amber-500 via-orange-500 to-rose-600",
  "from-teal-500 via-cyan-600 to-blue-700",
  "from-emerald-600 via-lime-600 to-cyan-700",
  "from-slate-800 via-violet-900 to-fuchsia-800",
];

function normalizeProjectStatus(raw: string | null | undefined): ProjectStatus {
  const status = (raw ?? "").trim().toLowerCase();
  if (
    status === "generating" ||
    status === "ready" ||
    status === "draft" ||
    status === "published" ||
    status === "failed"
  ) {
    return status;
  }
  return "draft";
}

function categoryFromIdea(idea: string | null | undefined): string {
  const text = (idea ?? "").trim();
  const prefix = text.split(":")[0]?.trim();
  if (prefix && prefix.length <= 28 && prefix.length < text.length) return prefix;
  return "Video";
}

function gradientForId(id: string): string {
  const sum = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return gradients[sum % gradients.length]!;
}

export function titleFromIdea(idea: string): string {
  const text = idea.trim().replace(/\s+/g, " ");
  if (!text) return "Untitled video";
  return text.length > 64 ? `${text.slice(0, 61).trim()}...` : text;
}

export function mapProjectRow(row: ProjectRow): Project {
  const status = normalizeProjectStatus(row.status);
  return {
    id: row.id,
    title: row.title?.trim() || titleFromIdea(row.idea ?? ""),
    category: categoryFromIdea(row.idea),
    status,
    durationSec: 0,
    gradient: gradientForId(row.id),
    thumbProgress: status === "generating" ? Number(row.progress ?? 0) : undefined,
    idea: row.idea,
    createdAt: row.created_at,
  };
}

import type { Project, Series, Testimonial } from "./types";

export const sampleProjects: Project[] = [
  {
    id: "1",
    title: "5 Mind-Bending Space Facts",
    category: "Science",
    status: "generating",
    durationSec: 42,
    gradient: "from-violet-500 via-fuchsia-500 to-pink-500",
    thumbProgress: 65,
  },
  {
    id: "2",
    title: "The Dark Secret of Ancient Rome",
    category: "History",
    status: "ready",
    durationSec: 58,
    gradient: "from-sky-600 via-blue-700 to-indigo-900",
  },
  {
    id: "3",
    title: "Why Your Brain Lies to You",
    category: "Psychology",
    status: "published",
    durationSec: 45,
    gradient: "from-amber-500 via-orange-500 to-rose-600",
  },
  {
    id: "4",
    title: "Untitled Draft",
    category: "Motivation",
    status: "draft",
    durationSec: 0,
    gradient: "from-teal-500 via-cyan-600 to-blue-700",
  },
];

export const sampleSeries: Series[] = [
  {
    id: "s1",
    title: "Ancient Civilizations",
    category: "History",
    videoCount: 12,
    durationLabel: "8m 24s",
    voice: "Dramatic Male",
    thumbClass: "from-slate-800 to-indigo-900",
    viewsLabel: "142.8K",
    likesLabel: "9.4K",
    avgWatchLabel: "0:41",
    engagementPct: 74,
    engagementBarClass: "from-amber-400 via-orange-400 to-rose-500",
  },
  {
    id: "s2",
    title: "Mind Hacks",
    category: "Psychology",
    videoCount: 8,
    durationLabel: "6m 12s",
    voice: "Calm Female",
    thumbClass: "from-teal-600 to-cyan-700",
    viewsLabel: "87.3K",
    likesLabel: "6.2K",
    avgWatchLabel: "0:38",
    engagementPct: 81,
    engagementBarClass: "from-violet-500 via-fuchsia-500 to-teal-400",
  },
  {
    id: "s3",
    title: "Crypto Secrets",
    category: "Finance",
    videoCount: 5,
    durationLabel: "3m 18s",
    voice: "Energetic Male",
    thumbClass: "from-emerald-900 to-lime-900",
    viewsLabel: "54.1K",
    likesLabel: "4.0K",
    avgWatchLabel: "0:35",
    engagementPct: 63,
    engagementBarClass: "from-orange-400 via-amber-500 to-lime-400",
  },
];

export const testimonials: Testimonial[] = [
  {
    id: "t1",
    initials: "AT",
    handle: "@alex_tiktok",
    quote:
      "Went from 0 to 100K followers in 3 months. This app is insane.",
  },
  {
    id: "t2",
    initials: "MK",
    handle: "@mindfulmk",
    quote: "Pro plan pays for itself. I save 10+ hours every single week.",
  },
];

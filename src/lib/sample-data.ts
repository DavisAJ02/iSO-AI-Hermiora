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
    description: "History shorts built around myth, power, and collapse.",
    defaultCreativeControls: {
      niche: "History",
      language: "English",
      voiceStyle: "Dark Dramatic",
      artStyle: "Painting",
      captionStyle: "Bold Stroke",
      backgroundMusic: "Mythic Drums",
      effects: ["Animated Hook"],
      exampleScript: "",
    },
    projectCount: 12,
    readyCount: 8,
    generatingCount: 2,
  },
  {
    id: "s2",
    title: "Mind Hacks",
    description: "Psychology explainers with fast, practical takeaways.",
    defaultCreativeControls: {
      niche: "Psychology",
      language: "English",
      voiceStyle: "Calm Explainer",
      artStyle: "Modern Cartoon",
      captionStyle: "Sleek",
      backgroundMusic: "Lo-fi Focus",
      effects: ["Cinematic Glow"],
      exampleScript: "",
    },
    projectCount: 8,
    readyCount: 6,
    generatingCount: 1,
  },
  {
    id: "s3",
    title: "Crypto Secrets",
    description: "Finance hooks with urgency, velocity, and creator pacing.",
    defaultCreativeControls: {
      niche: "Finance",
      language: "English",
      voiceStyle: "High Energy",
      artStyle: "Realism",
      captionStyle: "Red Highlight",
      backgroundMusic: "Luxury Trap",
      effects: ["Fast Zooms"],
      exampleScript: "",
    },
    projectCount: 5,
    readyCount: 4,
    generatingCount: 1,
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

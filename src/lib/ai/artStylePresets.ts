export type ArtStylePreset = {
  label: string;
  summary: string;
  tags: string[];
  previewClass: string;
  promptGuide: string;
  negativeGuide: string;
};

export const ART_STYLE_PRESETS: ArtStylePreset[] = [
  {
    label: "Polaroid",
    summary: "Warm analog portrait with dreamy fairy-light bokeh.",
    tags: ["Portrait", "Analog", "Warm"],
    previewClass: "from-rose-300 via-amber-200 to-orange-100",
    promptGuide:
      "luxury portrait photography, warm fairy-light bokeh, analog instant-film mood, shallow depth of field, soft skin tones, intimate close framing, premium editorial beauty shot",
    negativeGuide:
      "flat lighting, low-detail face, extra fingers, distorted eyes, warped hands, cheap selfie look, oversharpened skin",
  },
  {
    label: "Realism",
    summary: "Luxury cinematic photography with premium fashion polish.",
    tags: ["Photo", "Luxury", "Cinematic"],
    previewClass: "from-amber-100 via-orange-200 to-stone-300",
    promptGuide:
      "cinematic realistic photography, premium fashion editorial, full-body portrait, luxury lifestyle composition, golden-hour lighting, sharp subject separation, natural skin and fabric detail",
    negativeGuide:
      "plastic skin, cartoon anatomy, washed-out lighting, low detail, duplicate limbs, distorted vehicles, sloppy background",
  },
  {
    label: "Fantastic",
    summary: "Surreal epic environments with luminous fantasy scale.",
    tags: ["Epic", "Surreal", "Atmospheric"],
    previewClass: "from-cyan-300 via-sky-500 to-slate-800",
    promptGuide:
      "epic fantasy concept art, surreal environment, god rays, dramatic scale, detailed ruins, mystical atmosphere, premium cinematic fantasy illustration",
    negativeGuide:
      "dull environment, muddy details, flat water, weak lighting, modern objects, broken perspective, blurry subject",
  },
  {
    label: "Dark Fantasy",
    summary: "Grim illustrated mythic mood with gothic heroic detail.",
    tags: ["Gothic", "Mythic", "Heavy"],
    previewClass: "from-slate-500 via-zinc-800 to-emerald-300",
    promptGuide:
      "grim dark fantasy illustration, gothic heroic figure, high-contrast lighting, raven and ancient symbols, mythic northern atmosphere, premium illustrated cover art",
    negativeGuide:
      "cute mood, pastel palette, modern props, weak contrast, soft anatomy, muddy armor detail, flat composition",
  },
  {
    label: "Lego",
    summary: "Toy-brick diorama look with playful premium macro lighting.",
    tags: ["Toy", "Macro", "Playful"],
    previewClass: "from-amber-100 via-yellow-200 to-orange-300",
    promptGuide:
      "toy brick diorama, macro product photography, glossy plastic texture, shallow depth of field, playful cinematic miniature scene, premium collectible toy look",
    negativeGuide:
      "real human skin, melted plastic, broken brick geometry, low-detail toy face, muddy colors, deformed accessories",
  },
  {
    label: "Ghibli",
    summary: "Whimsical hand-painted fantasy with soft sunlight and wonder.",
    tags: ["Whimsical", "Painterly", "Cozy"],
    previewClass: "from-lime-100 via-emerald-200 to-amber-100",
    promptGuide:
      "whimsical hand-painted fantasy animation, soft sunlight, lush environment, cozy magical details, tender storybook mood, richly illustrated background",
    negativeGuide:
      "photorealistic skin, harsh realism, noisy line art, cluttered scene, dark horror mood, cheap CGI look",
  },
  {
    label: "Anime",
    summary: "Clean cel-shaded poster art with sharp character focus.",
    tags: ["Cel-shaded", "Poster", "Bold"],
    previewClass: "from-fuchsia-200 via-violet-300 to-indigo-500",
    promptGuide:
      "clean anime key visual, polished cel shading, elegant linework, dramatic character posing, crisp costume detail, premium poster composition",
    negativeGuide:
      "realistic skin pores, broken anatomy, messy line art, muddy shading, low-detail face, awkward hands, cluttered background",
  },
  {
    label: "Painting",
    summary: "Rich brushwork and poster-grade dramatic portrait painting.",
    tags: ["Brushwork", "Poster", "Dramatic"],
    previewClass: "from-amber-200 via-rose-200 to-orange-300",
    promptGuide:
      "painterly illustration, rich brushwork, museum-poster composition, dramatic facial features, refined texture, premium historical portrait painting",
    negativeGuide:
      "flat digital render, cartoon simplification, weak brush texture, distorted facial proportions, noisy background, low detail",
  },
  {
    label: "Disney",
    summary: "Polished animated-feature character render with warm storytelling light.",
    tags: ["3D", "Warm", "Expressive"],
    previewClass: "from-amber-100 via-orange-200 to-violet-200",
    promptGuide:
      "stylized family-animation 3D film look, expressive face, soft cinematic lighting, polished materials, warm interior storytelling shot, premium animated feature quality",
    negativeGuide:
      "photorealism, uncanny face, stiff pose, cheap mobile-game render, noisy shadows, broken hands, lifeless eyes",
  },
  {
    label: "Mythology",
    summary: "Heroic thunder-lit legend art with divine poster framing.",
    tags: ["Heroic", "Legend", "Storm"],
    previewClass: "from-slate-700 via-sky-300 to-slate-900",
    promptGuide:
      "heroic mythological illustration, divine warrior pose, thunderstorm sky, ornate spear and shield, epic classical fantasy composition, premium legend poster art",
    negativeGuide:
      "modern clothing, weak heroic scale, dull sky, flat armor, casual mood, low detail, broken anatomy",
  },
  {
    label: "Pixel Art",
    summary: "Premium RPG shrine scenes with crisp tile detail.",
    tags: ["Retro", "RPG", "Crisp"],
    previewClass: "from-pink-200 via-stone-100 to-slate-300",
    promptGuide:
      "high-detail premium pixel art, symmetrical shrine environment, crisp sprite edges, deliberate tile work, nostalgic RPG atmosphere, rich color contrast",
    negativeGuide:
      "blurry pixels, smeared shading, realistic rendering, uneven tile perspective, muddy palette, low-detail architecture",
  },
  {
    label: "Comic",
    summary: "Graphic novel linework with clean shapes and confident framing.",
    tags: ["Linework", "Graphic", "Bold"],
    previewClass: "from-sky-300 via-cyan-200 to-slate-100",
    promptGuide:
      "stylized comic illustration, bold contour lines, clean shapes, graphic novel framing, polished flat colors with selective shading, premium cover-art look",
    negativeGuide:
      "photorealism, weak line art, muddy tones, accidental realism, low-detail face, broken perspective, messy composition",
  },
  {
    label: "Creepy Comic",
    summary: "Moody horror-comic scenes with unsettling expressions and shadows.",
    tags: ["Horror", "Moody", "Shadow"],
    previewClass: "from-stone-300 via-zinc-500 to-slate-800",
    promptGuide:
      "stylized eerie comic illustration, unsettling character design, moody interiors, graphic linework, shadow-heavy storytelling, premium horror-comic panel quality",
    negativeGuide:
      "cute comedy mood, bright cheerful lighting, realistic skin texture, weak expression, flat shadows, low detail",
  },
  {
    label: "Modern Cartoon",
    summary: "Edgy social-media illustration with soft painterly shading.",
    tags: ["Edgy", "Stylized", "Social"],
    previewClass: "from-slate-200 via-rose-200 to-orange-200",
    promptGuide:
      "premium modern cartoon illustration, clean bold shapes, fashionable edgy character design, soft painterly shading, social-media-ready poster composition",
    negativeGuide:
      "realistic skin pores, muddy color, broken anatomy, weak facial expression, cluttered background, cheap clip-art look",
  },
];

const byLabel = new Map(ART_STYLE_PRESETS.map((preset) => [preset.label, preset] as const));
byLabel.set("Creep Comic", byLabel.get("Creepy Comic")!);

export function getArtStylePreset(style: string | null | undefined) {
  return byLabel.get((style ?? "").trim()) ?? null;
}

-- Extend generations.step for full video pipeline (image prompts, captions, render prep).

alter table public.generations drop constraint if exists generations_step_check;

alter table public.generations
  add constraint generations_step_check
  check (
    step in (
      'hook',
      'script',
      'scenes',
      'image_prompts',
      'voice',
      'captions',
      'render_prep',
      'render'
    )
  );

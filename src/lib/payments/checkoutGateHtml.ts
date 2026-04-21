function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Small HTML shell for checkout launcher errors so users never see an empty black page on GET.
 */
export function checkoutGateErrorPageHtml(input: {
  title: string;
  message: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHint?: string;
}): string {
  const hint = input.secondaryHint
    ? `<p style="margin:1rem 0 0;font-size:13px;color:#64748b;line-height:1.5">${escHtml(input.secondaryHint)}</p>`
    : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escHtml(input.title)}</title>
</head>
<body style="margin:0;font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;color:#0f172a;">
  <div style="max-width:28rem;margin:4rem auto;padding:2rem;background:#fff;border-radius:16px;box-shadow:0 10px 40px rgba(15,23,42,.08);border:1px solid #e2e8f0;">
    <h1 style="margin:0 0 .75rem;font-size:1.125rem;font-weight:600">${escHtml(input.title)}</h1>
    <p style="margin:0;font-size:14px;line-height:1.55;color:#334155">${escHtml(input.message)}</p>
    ${hint}
    <p style="margin:1.5rem 0 0">
      <a href="${escHtml(input.primaryHref)}" style="display:inline-block;padding:.65rem 1.25rem;background:#7c3aed;color:#fff;text-decoration:none;border-radius:999px;font-weight:600;font-size:14px;">${escHtml(input.primaryLabel)}</a>
    </p>
  </div>
</body>
</html>`;
}

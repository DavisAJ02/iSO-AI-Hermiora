/**
 * Builds a self-POSTing HTML page to MaishaPay hosted checkout.
 * MaishaPay hosted checkout requires secretApiKey in its browser POST form,
 * so this page must be short-lived and used only for the provider handoff.
 */

function escAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function buildMaishaAutoSubmitPage(params: {
  action: string;
  fields: Record<string, string>;
}): string {
  const inputs = Object.entries(params.fields)
    .map(
      ([name, value]) =>
        `<input type="hidden" name="${escAttr(name)}" value="${escAttr(value)}" />`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Redirecting to MaishaPay...</title>
</head>
<body>
  <p style="font-family:system-ui,sans-serif;padding:1.5rem">Redirecting to secure checkout...</p>
  <form id="m" method="post" action="${escAttr(params.action)}">
    ${inputs}
  </form>
  <script>document.getElementById("m").submit();</script>
</body>
</html>`;
}

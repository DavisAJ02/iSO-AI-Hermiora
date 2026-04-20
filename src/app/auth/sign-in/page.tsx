import { SignInForm } from "@/components/auth/SignInForm";
import { messageForOAuthCallbackError } from "@/lib/auth/oauthCallbackMessages";
import { safeNextPath } from "@/lib/auth/safeNextPath";

function firstParam(v: string | string[] | undefined): string | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; error?: string | string[] }>;
}) {
  const sp = await searchParams;
  const initialNext = safeNextPath(firstParam(sp.next));
  const oauthBanner = messageForOAuthCallbackError(firstParam(sp.error));
  return <SignInForm initialNext={initialNext} oauthBanner={oauthBanner} />;
}

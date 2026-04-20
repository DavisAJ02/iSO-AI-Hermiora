import { SignUpForm } from "@/components/auth/SignUpForm";
import { safeNextPath } from "@/lib/auth/safeNextPath";

function firstParam(v: string | string[] | undefined): string | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const sp = await searchParams;
  const initialNext = safeNextPath(firstParam(sp.next));
  return <SignUpForm initialNext={initialNext} />;
}

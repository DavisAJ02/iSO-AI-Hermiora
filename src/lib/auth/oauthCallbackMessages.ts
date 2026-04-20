/** Maps `?error=` from `/auth/sign-in` (set by `/auth/callback`) to user-facing copy. */
export function messageForOAuthCallbackError(code: string | undefined): string | null {
  switch (code) {
    case "oauth":
      return "Google sign-in was cancelled or could not start. Check that Google is enabled in Supabase and redirect URLs are configured.";
    case "session":
      return "We could not finish signing you in. Try again, or use email and password.";
    default:
      return code ? "Sign-in failed. Please try again." : null;
  }
}

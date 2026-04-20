const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export const AUTH_PASSWORD_MIN = 8;

export function isValidEmail(email: string): boolean {
  const t = email.trim();
  if (t.length < 5 || t.length > 254) return false;
  return EMAIL_RE.test(t);
}

export function isValidPassword(password: string): boolean {
  return password.length >= AUTH_PASSWORD_MIN;
}

export function passwordsMatch(a: string, b: string): boolean {
  return a === b;
}

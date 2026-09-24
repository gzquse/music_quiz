// Server-only: read environment variables by name at request time.
// A variable name held in a variable (process.env[name]) isn't replaced at build
// time, so values added in Vercel apply without depending on when the build ran.

export function runtimeEnv(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
}

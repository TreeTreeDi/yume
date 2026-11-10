// Shared argv helpers for the yume CLI entries. A bad flag value exits 2 here,
// at the boundary, so no entry point repeats the parse-or-die logic.
export function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}

export function intFlag(args: string[], name: string, min = 0): number | undefined {
  const raw = flag(args, name);
  if (raw === undefined) return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min) {
    console.error(`config error: --${name} expects an integer >= ${min}, got ${JSON.stringify(raw)}`);
    process.exit(2);
  }
  return n;
}

// Next.js 16 (App Router / Turbopack) does NOT URL-decode dynamic route
// params — a segment like "IMAT Past Papers" arrives as "IMAT%20Past%20Papers".
// Any id that contains a space or other special character therefore won't
// match the stored value unless we decode it ourselves. decodeURIComponent
// throws on malformed input, so fall back to the raw value on error.
export function decodeParam(value: string): string {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

import "server-only";
export function appBaseUrl() {
  return (
    process.env.APP_BASE_URL?.trim() ||
    process.env.RENDER_EXTERNAL_URL?.trim() ||
    ""
  ).replace(/\/+$/, "");
}
export function secureSessionCookie() {
  return (
    process.env.NODE_ENV === "production" && appBaseUrl().startsWith("https://")
  );
}
export function saveNotice() {
  return process.env.SAVE_STORAGE === "ephemeral"
    ? "Free public demo: saves are temporary and may reset when the server restarts or redeploys. Export your investigation to keep a copy."
    : null;
}

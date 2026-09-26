/** Frontend origin for browser redirects; the API may use a different port. */
export function siteOrigin(request: { url: string }): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL).origin;
  }

  // Preserve existing production deployments where nginx serves both apps
  // at the configured public API origin. Local development uses the incoming
  // frontend origin (usually :3000), never the API's :8080 address.
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_API_URL) {
    return new URL(process.env.NEXT_PUBLIC_API_URL).origin;
  }
  return new URL(request.url).origin;
}

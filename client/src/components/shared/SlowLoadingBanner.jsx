// Cold-start hints disabled — backend runs on VPS / localhost (not Render free tier).
// Exports kept so existing page imports continue to work without changes.
export function useSlowLoadingHint() {
  return false
}

export function SlowLoadingBanner() {
  return null
}

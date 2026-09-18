// Legacy CLI fixture selection uses the worker title rather than dependency injection.
// Set it explicitly so tests never fall through to the user's config or vault.
process.title = "vitest"

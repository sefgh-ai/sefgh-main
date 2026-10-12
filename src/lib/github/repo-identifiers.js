/**
 * Checks for the values the repository routes place into GitHub URLs.
 *
 * These exist for safety, not to police GitHub's naming rules: a value that
 * passes can only ever name one path segment, so it cannot reach a different
 * GitHub endpoint. The Go backend applies the same rules in
 * backend/internal/githubrepos, and contracts/github-repositories pins both.
 */

// An account name: a letter or digit, then letters, digits, hyphens or
// underscores, 39 characters at most.
const OWNER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,38}$/

// A repository name: letters, digits, dots, hyphens and underscores, 100
// characters at most.
const REPO_PATTERN = /^[A-Za-z0-9._-]{1,100}$/

// ASCII control characters, which have no place in a file path.
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/

export function isValidOwner(owner) {
  return typeof owner === 'string' && OWNER_PATTERN.test(owner)
}

export function isValidRepoName(name) {
  // "." and ".." are made only of allowed characters, but in a URL they mean
  // "this folder" and "the folder above".
  return typeof name === 'string' && REPO_PATTERN.test(name) && name !== '.' && name !== '..'
}

/**
 * Turns a file path inside a repository into the form used in a GitHub URL,
 * or returns null when the path is not acceptable.
 *
 * Each part between slashes is percent-encoded on its own, so a name that
 * contains "#", "?" or "%" stays a name instead of changing the URL's meaning.
 */
export function encodeContentsPath(path) {
  if (path === '') return ''
  if (path.includes('\\') || CONTROL_CHARACTERS.test(path)) return null
  const segments = path.split('/')
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
    return null
  }
  return segments.map(encodeURIComponent).join('/')
}

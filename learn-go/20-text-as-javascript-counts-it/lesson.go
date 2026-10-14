// Package lesson20 cuts text where JavaScript cuts it. fallbackTitle is the
// fallback chat title of backend/internal/aichat/title.go, returning plain
// UTF-16 units instead of jscompat.UTF16.
package lesson20

// maxTitleUnits is how long a fallback title may be before it is cut, in
// UTF-16 units, as JavaScript's length counts.
const maxTitleUnits = 30

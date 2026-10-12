package lesson14

import "net/url"

// escape percent-encodes one part of a path, so that characters such as
// "#", "?" and "%" become part of a name. The real backend uses its own
// encoder, jscompat.EncodeURIComponent, to match JavaScript byte for byte.
func escape(part string) string {
	return url.PathEscape(part)
}

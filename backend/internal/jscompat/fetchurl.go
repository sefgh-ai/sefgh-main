package jscompat

import (
	"errors"
	"net/url"
	"strings"
)

// FetchURL implements the HTTP URL normalization exercised by the repository
// fixtures: UTF-8 percent encoding, dot segments, fragments and control bytes.
// It is not a general WHATWG URL parser. The authority must be a valid absolute
// HTTP(S) origin; credentials in URLs are rejected, as fetch rejects them.
func FetchURL(raw string) (*url.URL, error) {
	raw = strings.TrimFunc(raw, func(r rune) bool { return r <= 0x20 })
	raw = strings.NewReplacer("\t", "", "\n", "", "\r", "").Replace(raw)
	raw, _, _ = strings.Cut(raw, "#")
	scheme, rest, ok := strings.Cut(raw, "://")
	if !ok || (scheme != "https" && scheme != "http") {
		return nil, errors.New("absolute HTTP URL required")
	}
	beforeQuery, query, hasQuery := strings.Cut(rest, "?")
	beforeQuery = strings.ReplaceAll(beforeQuery, `\`, "/")
	authority, path, hasPath := strings.Cut(beforeQuery, "/")
	origin, err := url.Parse(scheme + "://" + authority)
	if err != nil || origin.Host == "" || origin.User != nil {
		return nil, errors.New("invalid HTTP origin")
	}
	if !hasPath {
		path = ""
	}
	segments := strings.Split("/"+path, "/")
	normalized := []string{""}
	for i, segment := range segments[1:] {
		dot := strings.ReplaceAll(strings.ToLower(segment), "%2e", ".")
		switch dot {
		case ".":
			if i == len(segments)-2 {
				normalized = append(normalized, "")
			}
		case "..":
			if len(normalized) > 1 {
				normalized = normalized[:len(normalized)-1]
			}
			if i == len(segments)-2 {
				normalized = append(normalized, "")
			}
		default:
			normalized = append(normalized, segment)
		}
	}
	encodedPath := fetchEncode(strings.Join(normalized, "/"), false)
	encodedQuery := fetchEncode(query, true)
	result, err := url.Parse(scheme + "://" + authority + encodedPath)
	if err != nil {
		// Browsers keep a literal invalid percent escape on the wire. Opaque
		// preserves those bytes; Go's normal Path parser would reject them.
		result = &url.URL{Scheme: scheme, Host: authority, Opaque: encodedPath}
	}
	result.RawQuery = encodedQuery
	result.ForceQuery = hasQuery
	return result, nil
}

func fetchEncode(s string, query bool) string {
	const hex = "0123456789ABCDEF"
	var b strings.Builder
	for i := 0; i < len(s); i++ {
		c := s[i]
		escape := c <= 0x20 || c > 0x7e || strings.ContainsRune(`"<>`, rune(c))
		if query {
			escape = escape || c == '\''
		} else {
			escape = escape || strings.ContainsRune("?`{}", rune(c))
		}
		if escape {
			b.WriteByte('%')
			b.WriteByte(hex[c>>4])
			b.WriteByte(hex[c&15])
		} else {
			b.WriteByte(c)
		}
	}
	return b.String()
}

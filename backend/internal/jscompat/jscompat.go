// Package jscompat reproduces the small pieces of JavaScript and URL
// Standard behaviour that the Next.js handlers rely on, so that Go ports read
// requests and build upstream URLs byte for byte the way they do.
//
// Go's standard library makes different, equally reasonable choices in both
// places, and the contract fixtures in contracts/ would catch the difference.
package jscompat

import "strings"

// Pair is one name-value pair from a query string.
type Pair struct {
	Name  string
	Value string
}

// Query holds the pairs of a query string in their original order.
type Query []Pair

// ParseQuery parses a raw query string, without its leading "?", the way
// browsers and JavaScript's URLSearchParams do: "+" is a space, a "%" that
// does not start a valid escape stays a literal "%", and only "&" separates
// pairs. Go's url.ParseQuery differs on all three points.
//
// Bytes that are not valid UTF-8 after decoding are replaced with U+FFFD.
// A browser may produce a different number of replacement characters; the
// contract leaves such input unspecified.
func ParseQuery(raw string) Query {
	var q Query
	for _, part := range strings.Split(raw, "&") {
		if part == "" {
			continue
		}
		name, value, _ := strings.Cut(part, "=")
		q = append(q, Pair{Name: decode(name), Value: decode(value)})
	}
	return q
}

// Get returns the first value for name, like URLSearchParams.get. The
// boolean is false when name is absent, where JavaScript returns null.
func (q Query) Get(name string) (string, bool) {
	for _, p := range q {
		if p.Name == name {
			return p.Value, true
		}
	}
	return "", false
}

// decode turns "+" into a space, then percent-decodes leniently.
func decode(s string) string {
	s = strings.ReplaceAll(s, "+", " ")
	var b strings.Builder
	b.Grow(len(s))
	for i := 0; i < len(s); i++ {
		if s[i] == '%' && i+2 < len(s) && isHex(s[i+1]) && isHex(s[i+2]) {
			b.WriteByte(unhex(s[i+1])<<4 | unhex(s[i+2]))
			i += 2
			continue
		}
		b.WriteByte(s[i])
	}
	return strings.ToValidUTF8(b.String(), "\uFFFD")
}

// EncodeURIComponent percent-encodes s like JavaScript's encodeURIComponent:
// every byte except A-Z a-z 0-9 - _ . ! ~ * ' ( ) becomes %XX in upper-case
// hex. For valid UTF-8 the result is identical to JavaScript's.
func EncodeURIComponent(s string) string {
	const hex = "0123456789ABCDEF"
	var b strings.Builder
	b.Grow(len(s))
	for i := 0; i < len(s); i++ {
		c := s[i]
		if isUnreserved(c) {
			b.WriteByte(c)
			continue
		}
		b.WriteByte('%')
		b.WriteByte(hex[c>>4])
		b.WriteByte(hex[c&0x0F])
	}
	return b.String()
}

func isUnreserved(c byte) bool {
	if 'A' <= c && c <= 'Z' || 'a' <= c && c <= 'z' || '0' <= c && c <= '9' {
		return true
	}
	return strings.IndexByte("-_.!~*'()", c) >= 0
}

func isHex(c byte) bool {
	return '0' <= c && c <= '9' || 'a' <= c && c <= 'f' || 'A' <= c && c <= 'F'
}

func unhex(c byte) byte {
	switch {
	case '0' <= c && c <= '9':
		return c - '0'
	case 'a' <= c && c <= 'f':
		return c - 'a' + 10
	default:
		return c - 'A' + 10
	}
}

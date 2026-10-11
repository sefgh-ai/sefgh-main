//go:build solution

package lesson03

import "strings"

func isUnreserved(c byte) bool {
	if 'A' <= c && c <= 'Z' || 'a' <= c && c <= 'z' || '0' <= c && c <= '9' {
		return true
	}
	return strings.IndexByte("-_.!~*'()", c) >= 0
}

func percentEncode(s string) string {
	const hex = "0123456789ABCDEF"
	var b strings.Builder
	for i := 0; i < len(s); i++ {
		c := s[i]
		if isUnreserved(c) {
			b.WriteByte(c)
			continue
		}
		b.WriteByte('%')
		b.WriteByte(hex[c>>4])   // the high four bits: c / 16
		b.WriteByte(hex[c&0x0F]) // the low four bits:  c % 16
	}
	return b.String()
}

func countCharacters(s string) int {
	count := 0
	for range s {
		count++
	}
	return count
}

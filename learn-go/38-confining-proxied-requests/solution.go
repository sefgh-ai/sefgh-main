//go:build solution

package lesson38

import (
	"net/http"
	"strings"
)

func publicSchemaOnly(headers http.Header) bool {
	for _, name := range []string{"Accept-Profile", "Content-Profile"} {
		for _, value := range headers.Values(name) {
			if strings.TrimSpace(value) != "public" {
				return false
			}
		}
	}
	return true
}

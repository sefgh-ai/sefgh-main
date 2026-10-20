//go:build !solution

package lesson38

import "net/http"

func publicSchemaOnly(headers http.Header) bool {
	// TODO: inspect every value of both schema-selection headers.
	return false
}

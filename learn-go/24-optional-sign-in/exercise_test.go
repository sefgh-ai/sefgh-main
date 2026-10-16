package lesson24

import "testing"

func TestBearerReadsTheToken(t *testing.T) {
	token, ok := bearer("Bearer eyJhbGciOi.payload.signature")
	if !ok || token != "eyJhbGciOi.payload.signature" {
		t.Errorf("bearer = %q, %v; want the token and true", token, ok)
	}
}

func TestBearerRefusesOtherForms(t *testing.T) {
	for _, header := range []string{
		"",                   // no header: signed out
		"Basic dXNlcjpwYXNz", // another scheme
		"bearer abc",         // the scheme is written exactly
		"Bearer ",            // nothing after it
		"Bearer abc def",     // a token never holds a space
		"Bearer abc\tdef",
		"abc",
	} {
		if token, ok := bearer(header); ok || token != "" {
			t.Errorf("bearer(%q) = %q, %v; want \"\", false", header, token, ok)
		}
	}
}

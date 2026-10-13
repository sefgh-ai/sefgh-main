package githubrepos

import (
	"context"
	"net/http"
	"testing"
)

func TestPrivateEnrichmentCannotForwardCredentialToAnotherOrigin(t *testing.T) {
	calls := 0
	client := &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		calls++
		t.Error("credential reached transport")
		return nil, nil
	})}
	h := New(client, "https://api.github.com", "gh-a")
	if _, err := h.fetch(context.Background(), "https://other.test/languages", "application/json", true); err == nil || calls != 0 {
		t.Fatal("external enrichment target accepted")
	}
	if h.client.CheckRedirect == nil {
		t.Fatal("authenticated redirects are not blocked")
	}
}

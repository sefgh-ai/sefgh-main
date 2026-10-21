package lesson42

import (
	"reflect"
	"testing"
)

func TestReservationKeepsAuthorityInDatabase(t *testing.T) {
	input := attempt{"selector", "digest", "request", "public-search", "forged-owner", "future-time", 999999}
	got, err := reserveArgs(input, "approved-v1")
	want := map[string]string{"p_selector": "selector", "p_verifier_hex": "digest", "p_request_id": "request", "p_endpoint": "public-search", "p_revision": "approved-v1"}
	if err != nil || !reflect.DeepEqual(got, want) {
		t.Fatalf("got %v, %v; want only the five fixed fields", got, err)
	}
}
func TestInvalidReservationNeverBuildsPayload(t *testing.T) {
	for _, input := range []attempt{{requestID: "request", endpoint: "chat"}, {endpoint: "public-search"}} {
		got, err := reserveArgs(input, "v1")
		if got != nil || err != errInput {
			t.Fatal("invalid reservation accepted")
		}
	}
	got, err := reserveArgs(attempt{requestID: "request", endpoint: "public-search"}, "")
	if got != nil || err != errInput {
		t.Fatal("missing policy revision accepted")
	}
}

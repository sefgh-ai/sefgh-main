package lesson05

import (
	"encoding/json"
	"testing"
)

func marshal(t *testing.T, v any) string {
	t.Helper()
	data, err := json.Marshal(v)
	if err != nil {
		t.Fatalf("json.Marshal: %v", err)
	}
	return string(data)
}

func TestErrorReplyWithoutRateLimit(t *testing.T) {
	got := marshal(t, errorReply{Error: "Search query is required"})
	want := `{"error":"Search query is required"}`
	if got != want {
		t.Errorf("got  %s\nwant %s", got, want)
	}
}

func TestErrorReplyWithRateLimit(t *testing.T) {
	remaining := "0"
	got := marshal(t, errorReply{
		Error:     "slow down",
		RateLimit: &rateLimit{Remaining: &remaining}, // Reset stays nil
	})
	want := `{"error":"slow down","rate_limit":{"remaining":"0","reset":null}}`
	if got != want {
		t.Errorf("got  %s\nwant %s", got, want)
	}
}

func TestTotalCount(t *testing.T) {
	got, err := totalCount([]byte(`{"total_count": 42, "items": []}`))
	if err != nil || got != 42 {
		t.Errorf("totalCount = %d, %v; want 42, nil", got, err)
	}

	if _, err := totalCount([]byte(`<html>not json</html>`)); err == nil {
		t.Error("totalCount of a body that is not JSON returned no error")
	}
}

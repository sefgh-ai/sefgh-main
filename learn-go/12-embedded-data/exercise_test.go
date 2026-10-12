package lesson12

import (
	"encoding/json"
	"net/http/httptest"
	"reflect"
	"testing"
)

func TestServeCatalog(t *testing.T) {
	for _, path := range []string{"/languages", "/languages?q=Rust&limit=1"} {
		rec := httptest.NewRecorder()
		serveCatalog(rec, httptest.NewRequest("GET", path, nil))
		if rec.Code != 200 {
			t.Errorf("status = %d", rec.Code)
		}
		if rec.Header().Get("Content-Type") != "application/json" {
			t.Error("missing JSON content type")
		}
		var got []string
		if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
			t.Fatalf("expected JSON array: %v", err)
		}
		if !reflect.DeepEqual(got, []string{"C#", "Go", "Rust"}) {
			t.Fatalf("catalog = %v", got)
		}
	}
}

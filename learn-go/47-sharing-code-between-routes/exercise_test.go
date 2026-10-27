package lesson47

import "testing"

// Each want is what `JSON.parse(text)?.private === false` gives in
// JavaScript, with text that does not parse counting as false.
func TestIsPublicMatchesStrictFalse(t *testing.T) {
	for _, tt := range []struct {
		text string
		want bool
	}{
		{`{"id":1,"private":false}`, true},
		{`{ "private" : false }`, true},
		{`{"private":true,"private":false}`, true},
		{`{"private":false,"private":true}`, false},
		{`{"private":"false"}`, false},
		{`{"private":0}`, false},
		{`{"private":null}`, false},
		{`{}`, false},
		{`[{"private":false}]`, false},
		{`null`, false},
		{`not json`, false},
	} {
		if got := isPublic([]byte(tt.text)); got != tt.want {
			t.Errorf("isPublic(%s) = %v, want %v", tt.text, got, tt.want)
		}
	}
}

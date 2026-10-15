package lesson23

import (
	"encoding/json"
	"reflect"
	"testing"
)

var github = []Field{
	{"id", json.RawMessage(`70123`)},
	{"language", json.RawMessage(`null`)},
	{"description", json.RawMessage(`"A router"`)},
	{"stargazers_count", json.RawMessage(`9007199254740993`)},
}

var names = []string{"description", "stargazers_count", "forks_count", "language"}

func TestPickKeepsTheOrderOfNames(t *testing.T) {
	got := pick(github, names)
	want := []Field{
		{"description", json.RawMessage(`"A router"`)},
		{"stargazers_count", json.RawMessage(`9007199254740993`)},
		// forks_count was not sent, so it is left out, not null.
		{"language", json.RawMessage(`null`)},
	}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("pick = %v\nwant   %v", got, want)
	}
}

func TestPickLeavesValuesUntouched(t *testing.T) {
	got := pick(github, []string{"stargazers_count"})
	// A float64 would have turned this into 9007199254740992.
	if len(got) != 1 || string(got[0].Value) != "9007199254740993" {
		t.Errorf("pick = %v; the value must be the same bytes", got)
	}
}

func TestPickWithNothingToFind(t *testing.T) {
	if got := pick(github, []string{"topics"}); len(got) != 0 {
		t.Errorf("pick = %v, want nothing", got)
	}
	if got := pick(nil, names); len(got) != 0 {
		t.Errorf("pick of no fields = %v, want nothing", got)
	}
}

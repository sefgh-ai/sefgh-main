package lesson44

import (
	"errors"
	"reflect"
	"testing"
)

type fakeStore struct {
	calls []string
	fail  string
}

func (s *fakeStore) Complete(id string) error {
	s.calls = append(s.calls, id)
	if id == s.fail {
		return errors.New("uncertain completion")
	}
	return nil
}

func TestUnknownCountsAgainstLimit(t *testing.T) {
	store := &fakeStore{}
	rows := []receipt{{"unknown", false}, {"saved", true}}
	got, err := scan(rows, 1, store)
	if err != nil || got != (progress{missing: 1, scanned: 1, more: true}) || len(store.calls) != 0 {
		t.Fatal("unknown rows still use the budget", got, err, store.calls)
	}
	got, err = scan(rows[got.scanned:], 1, store)
	if err != nil || got != (progress{completed: 1, scanned: 1}) || !reflect.DeepEqual(store.calls, []string{"saved"}) {
		t.Fatal("later receipt should complete", got, err, store.calls)
	}
}

func TestFailureLeavesCurrentRowForExactRetry(t *testing.T) {
	store := &fakeStore{fail: "second"}
	rows := []receipt{{"first", true}, {"second", true}, {"third", true}}
	got, err := scan(rows, 3, store)
	if err == nil || got != (progress{completed: 1, scanned: 1, more: true}) {
		t.Fatal("failed row was skipped", got, err)
	}
	store.fail = ""
	got, err = scan(rows[got.scanned:], 3, store)
	if err != nil || got != (progress{completed: 2, scanned: 2}) || !reflect.DeepEqual(store.calls, []string{"first", "second", "second", "third"}) {
		t.Fatal("retry the same receipt", got, err, store.calls)
	}
}

package lesson11

import (
	"context"
	"errors"
	"testing"
)

func TestPublishedResult(t *testing.T) {
	done := make(chan struct{})
	result := &sharedResult{}
	go func() {
		result.value = "repository"
		close(done)
	}()
	value, err := waitResult(context.Background(), done, result)
	if value != "repository" || err != nil {
		t.Fatalf("got %q, %v; want repository, nil", value, err)
	}
}

func TestPreservesSharedFailure(t *testing.T) {
	want := errors.New("upstream unavailable")
	done := make(chan struct{})
	result := &sharedResult{err: want}
	close(done)
	_, err := waitResult(context.Background(), done, result)
	if !errors.Is(err, want) {
		t.Fatalf("lost original failure: %v", err)
	}
}

func TestCancellationBeforeOrWithCompletion(t *testing.T) {
	for _, completed := range []bool{false, true} {
		ctx, cancel := context.WithCancel(context.Background())
		cancel()
		done := make(chan struct{})
		if completed {
			close(done)
		}
		value, err := waitResult(ctx, done, &sharedResult{value: "stale result"})
		if value != "" || !errors.Is(err, context.Canceled) {
			t.Fatalf("got %q, %v; cancellation must win", value, err)
		}
	}
}

package lesson40

import "sync"

// Shared scaffolding for both exercise and solution, including ordinary builds.
type valueState struct {
	mu    sync.Mutex
	value string
}
type oneTimeValue struct{ state *valueState }

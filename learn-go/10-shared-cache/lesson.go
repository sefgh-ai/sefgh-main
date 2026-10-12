package lesson10

import (
	"sync"
	"time"
)

type cache struct {
	mu    sync.Mutex
	saved map[string]time.Time
}

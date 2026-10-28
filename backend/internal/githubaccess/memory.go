package githubaccess

import (
	"crypto/sha256"
	"sync"
	"time"
)

// MemoryFor is how long Supabase Auth's successful answer about a session
// is remembered (R-042: about a minute, the owner's choice on 2026-10-28).
// Within it, the same session is not checked with Supabase again, so a
// signed-out session can still pass for up to this long. GitHub tokens are
// still checked every time (see askGitHub).
const MemoryFor = 60 * time.Second

// memoryMax bounds how many answers are kept at once.
const memoryMax = 10000

// Memory remembers successful identity answers by a hash of the credential;
// the credential itself is never kept. A refused or failed answer is not
// remembered, so a wrong credential is checked every time. A Verifier with
// no Memory asks every time, which is what the shared fixtures expect. One
// Memory may be shared by many Verifier values and goroutines.
type Memory struct {
	mu      sync.Mutex
	entries map[[32]byte]memoryEntry
	now     func() time.Time
}

type memoryEntry struct {
	reply any
	saved time.Time
}

// NewMemory returns an empty Memory.
func NewMemory() *Memory {
	return &Memory{entries: map[[32]byte]memoryEntry{}, now: time.Now}
}

// memoryKey names one credential of one kind by its SHA-256 hash.
func memoryKey(kind, credential string) [32]byte {
	return sha256.Sum256([]byte(kind + "\x00" + credential))
}

// recall answers a remembered reply younger than MemoryFor. Replies are
// read, never changed, by their users, so one may be handed to many.
func (m *Memory) recall(key [32]byte) (any, bool) {
	if m == nil {
		return nil, false
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	entry, found := m.entries[key]
	if !found {
		return nil, false
	}
	if m.now().Sub(entry.saved) >= MemoryFor {
		delete(m.entries, key)
		return nil, false
	}
	return entry.reply, true
}

// keep remembers a successful reply. When full, expired answers go first,
// then any one answer, so memory stays bounded.
func (m *Memory) keep(key [32]byte, reply any) {
	if m == nil {
		return
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	now := m.now()
	if len(m.entries) >= memoryMax {
		for k, entry := range m.entries {
			if now.Sub(entry.saved) >= MemoryFor {
				delete(m.entries, k)
			}
		}
		for k := range m.entries {
			if len(m.entries) < memoryMax {
				break
			}
			delete(m.entries, k)
		}
	}
	m.entries[key] = memoryEntry{reply: reply, saved: now}
}

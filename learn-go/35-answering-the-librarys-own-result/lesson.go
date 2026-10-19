// Package lesson35 checks which fields an update may change, as update does
// in backend/internal/onboarding/handler.go.
package lesson35

// writable are the fields the onboarding steps write.
var writable = map[string]bool{
	"current_step": true,
	"role":         true,
	"goals":        true,
	"completed":    true,
	"completed_at": true,
}

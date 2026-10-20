// Package apikey is an unwired key lifecycle core. It has no HTTP routes or
// database adapter. Its store interfaces must be implemented and reviewed before
// production use; tests against memory storage do not establish live RLS.
package apikey

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"strings"
	"sync"
)

const Prefix = "sk_sefgh_v1_"
const selectorBytes = 12
const secretBytes = 32
const tokenLength = len(Prefix) + 16 + 1 + 43

var ErrCredential = errors.New("invalid API credential")
var ErrEntropy = errors.New("API credential generation failed")
var ErrRevealed = errors.New("API credential already revealed")

// Verifier contains a digest, never the credential. Persistence adapters must
// explicitly export its bytes. Default formatting and JSON never expose them.
type Verifier struct{ digest [32]byte }

func (v Verifier) Bytes() [32]byte { return v.digest }
func (v Verifier) Equal(other Verifier) bool {
	var zero [32]byte
	valid := 1 - subtle.ConstantTimeCompare(v.digest[:], zero[:])
	return valid&subtle.ConstantTimeCompare(v.digest[:], other.digest[:]) == 1
}
func (v Verifier) Format(f fmt.State, _ rune) { _, _ = io.WriteString(f, "[API verifier redacted]") }
func (v Verifier) MarshalJSON() ([]byte, error) {
	return nil, errors.New("API verifier cannot be serialized")
}

func RestoreVerifier(digest []byte) (Verifier, error) {
	if len(digest) != sha256.Size {
		return Verifier{}, ErrCredential
	}
	var v Verifier
	copy(v.digest[:], digest)
	if v.digest == [32]byte{} {
		return Verifier{}, ErrCredential
	}
	return v, nil
}

// Secret is a one-time reveal handle. Value/pointer copies share private state
// and cannot create a second reveal. Once taken, only the caller owns the returned string; Go does
// not promise erasure of all copies in memory.
type revealState struct {
	mu    sync.Mutex
	value string
}
type Secret struct{ state *revealState }

func (s *Secret) Take() (string, error) {
	if s == nil || s.state == nil {
		return "", ErrRevealed
	}
	s.state.mu.Lock()
	defer s.state.mu.Unlock()
	if s.state.value == "" {
		return "", ErrRevealed
	}
	value := s.state.value
	s.state.value = ""
	return value, nil
}
func (s Secret) Format(f fmt.State, _ rune) { _, _ = io.WriteString(f, "[API secret redacted]") }
func (s Secret) MarshalJSON() ([]byte, error) {
	return nil, errors.New("API secret requires an explicit one-time reveal")
}

type Material struct {
	Selector string
	Verifier Verifier `json:"-"`
	Secret   *Secret  `json:"-"`
}

func Generate() (Material, error) { return generate(rand.Reader) }
func generate(entropy io.Reader) (Material, error) {
	var bytes [selectorBytes + secretBytes]byte
	if _, err := io.ReadFull(entropy, bytes[:]); err != nil {
		return Material{}, ErrEntropy
	}
	selector := base64.RawURLEncoding.EncodeToString(bytes[:selectorBytes])
	raw := Prefix + selector + "." + base64.RawURLEncoding.EncodeToString(bytes[selectorBytes:])
	return Material{selector, Verifier{sha256.Sum256([]byte(raw))}, &Secret{state: &revealState{value: raw}}}, nil
}

type Presented struct {
	Selector string
	Verifier Verifier
}

// Parse accepts only the exact new format. Legacy sk_hex, a stored digest,
// whitespace, header text and noncanonical base64 are not credentials here.
func Parse(raw string) (Presented, error) {
	if len(raw) != tokenLength || !strings.HasPrefix(raw, Prefix) {
		return Presented{}, ErrCredential
	}
	selector, secret, ok := strings.Cut(raw[len(Prefix):], ".")
	if !ok || len(selector) != 16 || len(secret) != 43 {
		return Presented{}, ErrCredential
	}
	for _, part := range []struct {
		text string
		size int
	}{{selector, selectorBytes}, {secret, secretBytes}} {
		decoded, err := base64.RawURLEncoding.Strict().DecodeString(part.text)
		if err != nil || len(decoded) != part.size {
			return Presented{}, ErrCredential
		}
	}
	return Presented{selector, Verifier{sha256.Sum256([]byte(raw))}}, nil
}

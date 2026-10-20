package apikey

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
)

func fixtureMaterial(t *testing.T) (Material, string) {
	t.Helper()
	m, err := generate(bytes.NewReader(bytes.Repeat([]byte{0x42}, selectorBytes+secretBytes)))
	if err != nil {
		t.Fatal(err)
	}
	raw, err := m.Secret.Take()
	if err != nil {
		t.Fatal(err)
	}
	return m, raw
}

func TestMaterialRoundTripAndStoredDigestIsNotCredential(t *testing.T) {
	m, raw := fixtureMaterial(t)
	p, err := Parse(raw)
	if err != nil || p.Selector != m.Selector || !p.Verifier.Equal(m.Verifier) {
		t.Fatalf("round trip: %v", err)
	}
	expected := sha256.Sum256([]byte(raw))
	if m.Verifier.Bytes() != expected {
		t.Fatal("incorrect digest")
	}
	restored, err := RestoreVerifier(expected[:])
	if err != nil || !restored.Equal(m.Verifier) {
		t.Fatal("restore")
	}
	for _, bad := range []string{"", hex.EncodeToString(expected[:]), "sk_" + strings.Repeat("a", 64), raw + " ", " " + raw, "Bearer " + raw, strings.Replace(raw, "v1_", "v2_", 1), raw[:len(raw)-1] + "=", raw[:len(raw)-1] + "B", raw + ".", strings.ToUpper(raw)} {
		if _, err := Parse(bad); !errors.Is(err, ErrCredential) {
			t.Fatal("malformed credential accepted")
		}
	}
	if _, err := RestoreVerifier(make([]byte, 32)); !errors.Is(err, ErrCredential) {
		t.Fatal("zero verifier accepted")
	}
	if _, err := RestoreVerifier([]byte{1}); !errors.Is(err, ErrCredential) {
		t.Fatal("short verifier accepted")
	}
	if (Verifier{}).Equal(Verifier{}) {
		t.Fatal("empty verifiers match")
	}
}

func TestRevealIsOnceAcrossConcurrentCallers(t *testing.T) {
	m, err := Generate()
	if err != nil {
		t.Fatal(err)
	}
	var successes atomic.Int32
	var wg sync.WaitGroup
	for range 40 {
		wg.Go(func() {
			raw, err := m.Secret.Take()
			if err == nil {
				if _, err := Parse(raw); err != nil {
					t.Error(err)
				}
				successes.Add(1)
			} else if !errors.Is(err, ErrRevealed) {
				t.Error(err)
			}
		})
	}
	wg.Wait()
	if successes.Load() != 1 {
		t.Fatalf("revealed %d times", successes.Load())
	}
	var nilSecret *Secret
	if _, err := nilSecret.Take(); !errors.Is(err, ErrRevealed) {
		t.Fatal(err)
	}
}

func TestValueCopiesShareOneRevealAndStayRedacted(t *testing.T) {
	m, err := Generate()
	if err != nil {
		t.Fatal(err)
	}
	duplicate := *m.Secret
	raw, err := m.Secret.Take()
	if err != nil {
		t.Fatal(err)
	}
	if second, err := duplicate.Take(); !errors.Is(err, ErrRevealed) || second != "" {
		t.Error("value copy created another reveal")
	}
	// A fresh, untaken value must not disclose through a pointer-only method
	// gap. The known synthetic credential is deliberate test material.
	_, known := fixtureMaterial(t)
	secret := &Secret{state: &revealState{value: known}}
	copyValue := *secret
	for _, format := range []string{"%v", "%+v", "%#v", "%s", "%q"} {
		if strings.Contains(fmt.Sprintf(format, copyValue), known) {
			t.Error("value formatting disclosed credential")
		}
	}
	if _, err := json.Marshal(copyValue); err == nil {
		t.Fatal("value JSON accepted")
	}
	_ = raw
}

func TestMaterialDoesNotLeakThroughFormattingOrJSON(t *testing.T) {
	m, raw := fixtureMaterial(t)
	secret := &Secret{state: &revealState{value: raw}}
	for _, value := range []any{secret, m.Verifier, Material{m.Selector, m.Verifier, secret}, Record{Verifier: m.Verifier}} {
		for _, format := range []string{"%v", "%+v", "%#v", "%s", "%q"} {
			printed := fmt.Sprintf(format, value)
			digest := m.Verifier.Bytes()
			if strings.Contains(printed, raw) || strings.Contains(printed, hex.EncodeToString(digest[:])) {
				t.Fatal("format exposed secret")
			}
		}
	}
	for _, value := range []any{secret, m.Verifier} {
		if _, err := json.Marshal(value); err == nil {
			t.Fatal("direct secret serialization accepted")
		}
	}
	data, err := json.Marshal(Material{m.Selector, m.Verifier, secret})
	if err != nil || bytes.Contains(data, []byte(raw)) {
		t.Fatalf("material JSON: %s %v", data, err)
	}
}

type failingEntropy struct{}

func (failingEntropy) Read([]byte) (int, error) {
	return 0, errors.New("sensitive entropy source details")
}
func TestEntropyFailuresAreSanitized(t *testing.T) {
	for _, reader := range []io.Reader{bytes.NewReader([]byte{1}), failingEntropy{}} {
		m, err := generate(reader)
		if err != ErrEntropy || m.Secret != nil || m.Selector != "" {
			t.Fatal("entropy failure did not fail closed")
		}
	}
}

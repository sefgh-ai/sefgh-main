package main

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestCommandExitCodes(t *testing.T) {
	base := filepath.Join("..", "..", "..", "contracts", "semantic-search", "example-baseline.json")
	candidate := filepath.Join("..", "..", "..", "contracts", "semantic-search", "example-candidate.json")
	args := []string{"-baseline", base, "-candidate", candidate, "-k", "3"}
	var out, errOut bytes.Buffer
	if code := run(args, &out, &errOut); code != 0 {
		t.Fatalf("%d %s", code, &errOut)
	}
	var report map[string]any
	if err := json.Unmarshal(out.Bytes(), &report); err != nil || report["parity"] != true {
		t.Fatalf("%s %v", &out, err)
	}
	data, err := os.ReadFile(candidate)
	if err != nil {
		t.Fatal(err)
	}
	changed := bytes.Replace(data, []byte(`"repo-alpha"`), []byte(`"repo-wrong"`), 1)
	path := filepath.Join(t.TempDir(), "changed.json")
	if err := os.WriteFile(path, changed, 0600); err != nil {
		t.Fatal(err)
	}
	args[3] = path
	out.Reset()
	errOut.Reset()
	if code := run(args, &out, &errOut); code != 1 || !bytes.Contains(out.Bytes(), []byte(`"parity": false`)) {
		t.Fatalf("%d %s %s", code, &out, &errOut)
	}
	args[3] = "https://example.invalid/run.json"
	out.Reset()
	errOut.Reset()
	if code := run(args, &out, &errOut); code != 2 || out.Len() != 0 {
		t.Fatalf("invalid input: %d %s", code, &out)
	}
	if code := run([]string{}, &out, &errOut); code != 2 {
		t.Fatal(code)
	}
	if code := run([]string{"-unknown"}, &out, &errOut); code != 2 {
		t.Fatal(code)
	}
	args[3] = candidate
	args = append(args, "-score-tolerance", "NaN")
	out.Reset()
	if code := run(args, &out, &errOut); code != 2 || out.Len() != 0 {
		t.Fatal(code)
	}
}

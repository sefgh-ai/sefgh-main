// Package searchparity compares recorded retrieval runs without contacting a
// model or database. Matching vector lengths alone never establish parity.
package searchparity

import (
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"reflect"
	"strings"
)

const MaxBytes = 8 << 20

// Identity describes one frozen retrieval experiment, not a live configuration.
// Hashes bind the actual corpus and preprocessing artifacts chosen by its owner.
type Identity struct {
	Pipeline          string `json:"pipeline"`
	Model             string `json:"model"`
	ModelRevision     string `json:"model_revision"`
	Dimensions        int    `json:"dimensions"`
	Normalization     string `json:"normalization"`
	DocumentTask      string `json:"document_task"`
	QueryTask         string `json:"query_task"`
	VectorColumn      string `json:"vector_column"`
	RPC               string `json:"rpc"`
	Metric            string `json:"metric"`
	CorpusSHA256      string `json:"corpus_sha256"`
	PreparationSHA256 string `json:"preparation_sha256"`
}

type Hit struct {
	ID    string  `json:"id"`
	Score float64 `json:"score"`
}

func (h *Hit) UnmarshalJSON(data []byte) error {
	var wire struct {
		ID    string   `json:"id"`
		Score *float64 `json:"score"`
	}
	dec := json.NewDecoder(strings.NewReader(string(data)))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&wire); err != nil {
		return err
	}
	if wire.Score == nil {
		return errors.New("every hit needs a numeric score")
	}
	*h = Hit{ID: wire.ID, Score: *wire.Score}
	return nil
}

type Query struct {
	ID            string `json:"id"`
	RequestSHA256 string `json:"request_sha256"`
	Hits          []Hit  `json:"hits"`
	// Relevance judgments belong only to the frozen baseline, never a candidate.
	RelevantIDs []string `json:"relevant_ids,omitempty"`
}

type Run struct {
	Version  int      `json:"version"`
	Identity Identity `json:"identity"`
	Queries  []Query  `json:"queries"`
}

type Quality struct {
	Recall         float64 `json:"recall_at_k"`
	ReciprocalRank float64 `json:"reciprocal_rank_at_k"`
}

type QueryReport struct {
	ID               string   `json:"id"`
	RequestSHA256    string   `json:"request_sha256"`
	RankingEqual     bool     `json:"ranking_equal"`
	ScoresEqual      bool     `json:"scores_equal"`
	Baseline         []string `json:"baseline_ids"`
	Candidate        []string `json:"candidate_ids"`
	BaselineQuality  *Quality `json:"baseline_quality"`
	CandidateQuality *Quality `json:"candidate_quality"`
}

type Report struct {
	Version        int           `json:"version"`
	Identity       Identity      `json:"identity"`
	Parity         bool          `json:"parity"`
	K              int           `json:"k"`
	ScoreTolerance float64       `json:"score_tolerance"`
	JudgedQueries  int           `json:"judged_queries"`
	Queries        []QueryReport `json:"queries"`
}

// Read refuses oversized, unknown, duplicate or trailing JSON before comparison.
// Duplicate object members are checked separately: encoding/json accepts them.
func Read(r io.Reader) (Run, error) {
	data, err := io.ReadAll(io.LimitReader(r, MaxBytes+1))
	if err != nil {
		return Run{}, err
	}
	if len(data) > MaxBytes {
		return Run{}, errors.New("run exceeds 8 MiB")
	}
	if err := uniqueMembers(json.NewDecoder(strings.NewReader(string(data)))); err != nil {
		return Run{}, err
	}
	dec := json.NewDecoder(strings.NewReader(string(data)))
	dec.DisallowUnknownFields()
	var run Run
	if err := dec.Decode(&run); err != nil {
		return Run{}, err
	}
	if err := validate(run); err != nil {
		return Run{}, err
	}
	return run, nil
}

func uniqueMembers(dec *json.Decoder) error {
	var value func() error
	value = func() error {
		t, err := dec.Token()
		if err != nil {
			return err
		}
		if t == json.Delim('{') {
			seen := map[string]bool{}
			for dec.More() {
				key, err := dec.Token()
				if err != nil {
					return err
				}
				name, ok := key.(string)
				if !ok || seen[name] {
					return errors.New("duplicate JSON member")
				}
				// Version 1 names are lowercase ASCII with underscores/digits.
				// encoding/json also matches case aliases (including Unicode
				// folds such as long-s), which could overwrite a canonical key.
				for _, c := range name {
					if !(c >= 'a' && c <= 'z' || c >= '0' && c <= '9' || c == '_') {
						return errors.New("noncanonical JSON member")
					}
				}
				seen[name] = true
				if err := value(); err != nil {
					return err
				}
			}
			_, err = dec.Token()
			return err
		}
		if t == json.Delim('[') {
			for dec.More() {
				if err := value(); err != nil {
					return err
				}
			}
			_, err = dec.Token()
			return err
		}
		return nil
	}
	if err := value(); err != nil {
		return err
	}
	if _, err := dec.Token(); err != io.EOF {
		return errors.New("expected one JSON value")
	}
	return nil
}

func hash(s string) bool {
	b, err := hex.DecodeString(s)
	return err == nil && len(b) == 32 && strings.ToLower(s) == s
}

func validate(run Run) error {
	if run.Version != 1 {
		return errors.New("unsupported run version")
	}
	i := run.Identity
	for _, s := range []string{i.Pipeline, i.Model, i.ModelRevision, i.Normalization, i.DocumentTask, i.QueryTask, i.VectorColumn, i.RPC, i.Metric} {
		if strings.TrimSpace(s) == "" {
			return errors.New("incomplete retrieval identity")
		}
	}
	if i.Dimensions < 1 || i.Dimensions > 65536 || !hash(i.CorpusSHA256) || !hash(i.PreparationSHA256) {
		return errors.New("invalid dimension or artifact hash")
	}
	if len(run.Queries) == 0 || len(run.Queries) > 10000 {
		return errors.New("expected 1..10000 queries")
	}
	seen := map[string]bool{}
	for _, q := range run.Queries {
		if strings.TrimSpace(q.ID) == "" || seen[q.ID] || !hash(q.RequestSHA256) {
			return errors.New("invalid or duplicate query identity")
		}
		seen[q.ID] = true
		if q.Hits == nil || len(q.Hits) > 1000 {
			return errors.New("hits must be an array of at most 1000 results")
		}
		ids := map[string]bool{}
		for _, h := range q.Hits {
			if strings.TrimSpace(h.ID) == "" || ids[h.ID] || math.IsNaN(h.Score) || math.IsInf(h.Score, 0) {
				return errors.New("invalid or duplicate result")
			}
			ids[h.ID] = true
		}
		ids = map[string]bool{}
		for _, id := range q.RelevantIDs {
			if strings.TrimSpace(id) == "" || ids[id] {
				return errors.New("invalid or duplicate relevance judgment")
			}
			ids[id] = true
		}
	}
	return nil
}

// Compare requires the same frozen experiment. A different model, RPC or corpus
// is an invalid comparison, not a retrieval regression. Top-k differences are
// returned in the report and do not become Go errors.
func Compare(baseline, candidate Run, k int, tolerance float64) (Report, error) {
	if err := validate(baseline); err != nil {
		return Report{}, fmt.Errorf("baseline: %w", err)
	}
	if err := validate(candidate); err != nil {
		return Report{}, fmt.Errorf("candidate: %w", err)
	}
	if k < 1 || k > 1000 || tolerance < 0 || math.IsNaN(tolerance) || math.IsInf(tolerance, 0) {
		return Report{}, errors.New("invalid k or score tolerance")
	}
	if baseline.Identity != candidate.Identity {
		return Report{}, errors.New("retrieval identities differ; freeze the same model, corpus, preprocessing and RPC")
	}
	if len(baseline.Queries) != len(candidate.Queries) {
		return Report{}, errors.New("query sets differ")
	}
	byID := map[string]Query{}
	for _, q := range candidate.Queries {
		if len(q.RelevantIDs) != 0 {
			return Report{}, errors.New("candidate must not supply relevance judgments")
		}
		byID[q.ID] = q
	}
	r := Report{Version: 1, Identity: baseline.Identity, Parity: true, K: k, ScoreTolerance: tolerance, Queries: make([]QueryReport, 0, len(baseline.Queries))}
	for _, b := range baseline.Queries {
		c, ok := byID[b.ID]
		if !ok || b.RequestSHA256 != c.RequestSHA256 {
			return Report{}, errors.New("query request identities differ")
		}
		bh, ch := b.Hits[:min(k, len(b.Hits))], c.Hits[:min(k, len(c.Hits))]
		q := QueryReport{ID: b.ID, RequestSHA256: b.RequestSHA256, RankingEqual: true, ScoresEqual: true, Baseline: make([]string, 0, len(bh)), Candidate: make([]string, 0, len(ch))}
		for _, h := range bh {
			q.Baseline = append(q.Baseline, h.ID)
		}
		for _, h := range ch {
			q.Candidate = append(q.Candidate, h.ID)
		}
		q.RankingEqual = reflect.DeepEqual(q.Baseline, q.Candidate)
		// Scores compare by repository identity, including when ranks change.
		scores := map[string]float64{}
		for _, h := range bh {
			scores[h.ID] = h.Score
		}
		q.ScoresEqual = len(bh) == len(ch)
		for _, h := range ch {
			s, ok := scores[h.ID]
			if !ok || math.Abs(s-h.Score) > tolerance {
				q.ScoresEqual = false
			}
		}
		if len(b.RelevantIDs) > 0 {
			q.BaselineQuality, q.CandidateQuality = quality(bh, b.RelevantIDs), quality(ch, b.RelevantIDs)
			r.JudgedQueries++
		}
		r.Parity = r.Parity && q.RankingEqual && q.ScoresEqual
		r.Queries = append(r.Queries, q)
	}
	return r, nil
}

func quality(hits []Hit, relevant []string) *Quality {
	ids := map[string]bool{}
	for _, id := range relevant {
		ids[id] = true
	}
	q := &Quality{}
	found := 0
	for n, h := range hits {
		if ids[h.ID] {
			found++
			if q.ReciprocalRank == 0 {
				q.ReciprocalRank = 1 / float64(n+1)
			}
		}
	}
	q.Recall = float64(found) / float64(len(relevant))
	return q
}

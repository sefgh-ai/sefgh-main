package searchparity

import (
	"encoding/json"
	"math"
	"os"
	"reflect"
	"strings"
	"testing"
)

func frozen() Run {
	hash := strings.Repeat("a", 64)
	return Run{Version: 1, Identity: Identity{
		Pipeline: "synthetic-only", Model: "fixture-model", ModelRevision: "fixture-v1", Dimensions: 3,
		Normalization: "none", DocumentTask: "fixture-document", QueryTask: "fixture-query",
		VectorColumn: "fixture.embedding", RPC: "fixture_match", Metric: "cosine",
		CorpusSHA256: hash, PreparationSHA256: hash,
	}, Queries: []Query{{ID: "query-1", RequestSHA256: hash, Hits: []Hit{{"repo-a", 0.9}, {"repo-b", 0.8}, {"repo-c", 0.7}}, RelevantIDs: []string{"repo-a", "repo-c"}}}}
}

func candidate(b Run) Run {
	data, _ := json.Marshal(b)
	var c Run
	if err := json.Unmarshal(data, &c); err != nil {
		panic(err)
	}
	for i := range c.Queries {
		c.Queries[i].RelevantIDs = nil
	}
	return c
}

func TestRankingAndQualityAreSeparate(t *testing.T) {
	b := frozen()
	c := candidate(b)
	r, err := Compare(b, c, 2, 1e-6)
	if err != nil || !r.Parity || r.JudgedQueries != 1 {
		t.Fatalf("%+v %v", r, err)
	}
	if r.Queries[0].BaselineQuality.Recall != 0.5 || r.Queries[0].BaselineQuality.ReciprocalRank != 1 {
		t.Fatal(r.Queries[0])
	}
	c.Queries[0].Hits[0], c.Queries[0].Hits[1] = c.Queries[0].Hits[1], c.Queries[0].Hits[0]
	r, err = Compare(b, c, 2, 1e-6)
	if err != nil || r.Parity || r.Queries[0].RankingEqual || !r.Queries[0].ScoresEqual {
		t.Fatalf("%+v %v", r, err)
	}
	if r.Queries[0].CandidateQuality.ReciprocalRank != 0.5 || r.Queries[0].CandidateQuality.Recall != 0.5 {
		t.Fatal(r.Queries[0])
	}
}

func TestScoreToleranceMissingResultsAndTopK(t *testing.T) {
	b := frozen()
	c := candidate(b)
	c.Queries[0].Hits[0].Score += 0.00001
	r, _ := Compare(b, c, 2, 0.001)
	if !r.Parity {
		t.Fatal(r)
	}
	r, _ = Compare(b, c, 2, 0)
	if r.Parity || !r.Queries[0].RankingEqual || r.Queries[0].ScoresEqual {
		t.Fatal(r)
	}
	c = candidate(b)
	c.Queries[0].Hits[2] = Hit{"changed-outside-k", 0.2}
	r, _ = Compare(b, c, 2, 0)
	if !r.Parity {
		t.Fatal(r)
	}
	c.Queries[0].Hits = c.Queries[0].Hits[:1]
	r, _ = Compare(b, c, 2, 0)
	if r.Parity || r.Queries[0].ScoresEqual {
		t.Fatal(r)
	}
	c.Queries[0].Hits = []Hit{}
	r, _ = Compare(b, c, 2, 0)
	if r.Queries[0].CandidateQuality.Recall != 0 || r.Queries[0].CandidateQuality.ReciprocalRank != 0 {
		t.Fatal(r)
	}
}

func TestNoJudgmentsDoesNotClaimQuality(t *testing.T) {
	b := frozen()
	b.Queries[0].RelevantIDs = nil
	b.Queries[0].Hits = []Hit{}
	r, err := Compare(b, candidate(b), 5, 0)
	if err != nil || !r.Parity || r.JudgedQueries != 0 || r.Queries[0].BaselineQuality != nil || r.Queries[0].CandidateQuality != nil {
		t.Fatalf("%+v %v", r, err)
	}
}

func TestEveryIdentityFieldMustMatch(t *testing.T) {
	b := frozen()
	typ := reflect.TypeOf(b.Identity)
	for i := 0; i < typ.NumField(); i++ {
		t.Run(typ.Field(i).Name, func(t *testing.T) {
			c := candidate(b)
			field := reflect.ValueOf(&c.Identity).Elem().Field(i)
			if field.Kind() == reflect.Int {
				field.SetInt(field.Int() + 1)
			} else if strings.HasSuffix(typ.Field(i).Name, "SHA256") {
				field.SetString(strings.Repeat("b", 64))
			} else {
				field.SetString(field.String() + "changed")
			}
			if _, err := Compare(b, c, 5, 0); err == nil {
				t.Fatal("identity change accepted")
			}
		})
	}
}

func TestQuerySetAndRequestIdentity(t *testing.T) {
	b := frozen()
	for _, change := range []func(*Run){
		func(c *Run) { c.Queries[0].ID = "another-query" },
		func(c *Run) { c.Queries[0].RequestSHA256 = strings.Repeat("b", 64) },
		func(c *Run) {
			c.Queries = append(c.Queries, Query{ID: "extra", RequestSHA256: strings.Repeat("a", 64), Hits: []Hit{}})
		},
		func(c *Run) { c.Queries[0].RelevantIDs = []string{"repo-b"} },
	} {
		c := candidate(b)
		change(&c)
		if _, err := Compare(b, c, 5, 0); err == nil {
			t.Fatal("changed experiment accepted")
		}
	}
	b.Queries = append(b.Queries, Query{ID: "query-2", RequestSHA256: strings.Repeat("b", 64), Hits: []Hit{}})
	c := candidate(b)
	c.Queries[0], c.Queries[1] = c.Queries[1], c.Queries[0]
	if r, err := Compare(b, c, 5, 0); err != nil || !r.Parity {
		t.Fatalf("query order should not matter: %+v %v", r, err)
	}
}

func TestInvalidInputs(t *testing.T) {
	for _, change := range []func(*Run){
		func(r *Run) { r.Version = 2 }, func(r *Run) { r.Identity.Model = " " },
		func(r *Run) { r.Identity.Dimensions = 0 }, func(r *Run) { r.Identity.CorpusSHA256 = "not-a-hash" },
		func(r *Run) { r.Queries = nil }, func(r *Run) { r.Queries = append(r.Queries, r.Queries[0]) },
		func(r *Run) { r.Queries[0].Hits = nil }, func(r *Run) { r.Queries[0].Hits = append(r.Queries[0].Hits, r.Queries[0].Hits[0]) },
		func(r *Run) { r.Queries[0].Hits[0].Score = math.NaN() }, func(r *Run) { r.Queries[0].Hits[0].Score = math.Inf(1) },
		func(r *Run) { r.Queries[0].RelevantIDs = []string{"same", "same"} },
	} {
		b := frozen()
		change(&b)
		if _, err := Compare(b, candidate(frozen()), 5, 0); err == nil {
			t.Fatal("invalid baseline accepted")
		}
	}
	for _, v := range []float64{-1, math.NaN(), math.Inf(1)} {
		if _, err := Compare(frozen(), candidate(frozen()), 5, v); err == nil {
			t.Fatal("bad tolerance")
		}
	}
	for _, k := range []int{0, 1001} {
		if _, err := Compare(frozen(), candidate(frozen()), k, 0); err == nil {
			t.Fatal("bad k")
		}
	}
}

func TestStrictJSON(t *testing.T) {
	data, _ := json.Marshal(frozen())
	valid := string(data)
	if _, err := Read(strings.NewReader(valid)); err != nil {
		t.Fatal(err)
	}
	for name, input := range map[string]string{
		"unknown":            strings.Replace(valid, `"version":1`, `"version":1,"surprise":true`, 1),
		"duplicate":          strings.Replace(valid, `"version":1`, `"version":1,"version":1`, 1),
		"nested duplicate":   strings.Replace(valid, `"score":0.9`, `"score":0.9,"score":0.9`, 1),
		"model case alias":   strings.Replace(valid, `"model":"fixture-model"`, `"model":"different-model","Model":"fixture-model"`, 1),
		"model alias alone":  strings.Replace(valid, `"model":`, `"Model":`, 1),
		"hit case alias":     strings.Replace(valid, `"id":"repo-a"`, `"id":"wrong","ID":"repo-a"`, 1),
		"unicode case alias": strings.Replace(valid, `"score":`, `"ſcore":`, 1),
		"missing score":      strings.Replace(valid, `,"score":0.9`, "", 1),
		"null score":         strings.Replace(valid, `"score":0.9`, `"score":null`, 1),
		"unknown hit":        strings.Replace(valid, `"score":0.9`, `"score":0.9,"other":0`, 1),
		"trailing":           valid + " {}", "malformed": valid[:len(valid)-1], "null": "null",
		"oversize": strings.Repeat(" ", MaxBytes+1),
	} {
		t.Run(name, func(t *testing.T) {
			if _, err := Read(strings.NewReader(input)); err == nil {
				t.Fatal("bad JSON accepted")
			}
		})
	}
}

func TestNoncanonicalKeysAtEveryLevel(t *testing.T) {
	data, _ := json.Marshal(frozen())
	for _, key := range []string{"version", "identity", "pipeline", "model_revision", "dimensions", "normalization", "document_task", "query_task", "vector_column", "rpc", "metric", "corpus_sha256", "preparation_sha256", "queries", "id", "request_sha256", "hits", "score", "relevant_ids"} {
		t.Run(key, func(t *testing.T) {
			aliased := strings.Replace(string(data), `"`+key+`":`, `"`+strings.ToUpper(key[:1])+key[1:]+`":`, 1)
			if _, err := Read(strings.NewReader(aliased)); err == nil {
				t.Fatal("case alias accepted")
			}
		})
	}
}

func TestVersionedExamples(t *testing.T) {
	read := func(name string) Run {
		f, err := os.Open("../../../contracts/semantic-search/" + name)
		if err != nil {
			t.Fatal(err)
		}
		defer f.Close()
		r, err := Read(f)
		if err != nil {
			t.Fatal(err)
		}
		return r
	}
	b, c := read("example-baseline.json"), read("example-candidate.json")
	r, err := Compare(b, c, 3, 1e-6)
	if err != nil || !r.Parity || r.JudgedQueries != 1 {
		t.Fatalf("%+v %v", r, err)
	}
}

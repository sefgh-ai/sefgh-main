package lesson26

import (
	"encoding/json"
	"testing"
)

// Each answer was produced by JSON.stringify({ success: true, votes, userVote })
// in Node 21.
func TestReply(t *testing.T) {
	votes := `{"upvotes":2,"downvotes":1,"net_votes":1}`
	tests := []struct {
		name     string
		userVote json.RawMessage
		want     string
	}{
		{"a vote", json.RawMessage(`"upvote"`), `{"success":true,"votes":` + votes + `,"userVote":"upvote"}`},
		{"null stays", json.RawMessage(`null`), `{"success":true,"votes":` + votes + `,"userVote":null}`},
		{"empty text stays", json.RawMessage(`""`), `{"success":true,"votes":` + votes + `,"userVote":""}`},
		{"undefined is left out", nil, `{"success":true,"votes":` + votes + `}`},
	}
	for _, tt := range tests {
		if got := reply(votes, tt.userVote); got != tt.want {
			t.Errorf("%s:\n got  %s\n want %s", tt.name, got, tt.want)
		}
	}
}

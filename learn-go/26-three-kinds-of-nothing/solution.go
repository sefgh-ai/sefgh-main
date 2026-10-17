//go:build solution

package lesson26

import "encoding/json"

func reply(votes string, userVote json.RawMessage) string {
	out := `{"success":true,"votes":` + votes
	if userVote != nil {
		out += `,"userVote":` + string(userVote)
	}
	return out + "}"
}

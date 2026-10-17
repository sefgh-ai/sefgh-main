//go:build !solution

package lesson26

import "encoding/json"

// reply writes {"success":true,"votes":<votes>,"userVote":<userVote>} as
// JSON.stringify writes { success: true, votes, userVote }. userVote is the
// raw JSON the visitor sent: nil means it was not sent at all (undefined),
// and JSON.stringify leaves an undefined value out, name and all.
// json.RawMessage("null") is a real null, which stays.
//
// TODO:
//  1. Start with `{"success":true,"votes":` followed by votes.
//  2. When userVote is not nil, add `,"userVote":` and userVote.
//  3. Close the object with `}`.
func reply(votes string, userVote json.RawMessage) string {
	return ""
}

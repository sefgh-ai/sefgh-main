//go:build !solution

package lesson25

// savedBy is rows.some(s => s.user_id === userID). It returns whether a row
// belongs to userID, and ok = false where JavaScript would throw: a row that
// is null, reached before any match.
//
// TODO:
//  1. Loop over rows with range.
//  2. A nil row: return false, false (s.user_id throws on null).
//  3. Turn the row into a map with row.(map[string]any) and its "ok". A row
//     that is not an object simply does not match.
//  4. Read object["user_id"].(string). When it is text and equals userID,
//     return true, true right away: some() stops at the first match.
//  5. After the loop, return false, true.
func savedBy(rows []any, userID string) (saved, ok bool) {
	return false, false
}

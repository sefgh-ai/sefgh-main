//go:build !solution

package lesson34

// countSources counts rows as getSearchHistoryCount does. rows is the
// database's reply decoded from JSON: each row should be an object
// (map[string]any) with a "source".
//
// TODO:
//  1. Total is how many rows there are, whatever they hold.
//  2. A row counts for Search when it is an object whose "source" is the
//     text "search", and for Chat when it is the text "chat". Anything else
//     (another source, no source, not an object) counts in Total only.
//     Use the "comma ok" forms: row.(map[string]any) and source.(string).
func countSources(rows []any) Counts {
	return Counts{}
}

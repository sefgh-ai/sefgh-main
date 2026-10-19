//go:build !solution

package lesson36

// targetOf is the table, or "rpc/" and the function, that a Data API path
// names. rest is the part after /rest/v1/, without the query: "projects",
// "rpc/log_user_activity", or something longer that the policy then refuses.
//
// TODO:
//  1. If rest starts with "rpc/" (strings.CutPrefix), the answer is "rpc/"
//     and the next segment only: "rpc/log/extra" gives "rpc/log".
//  2. Otherwise the answer is the first segment: "projects/extra" gives
//     "projects". strings.Cut(s, "/") splits at the first slash.
func targetOf(rest string) string {
	return ""
}

//go:build solution

package access

import "strconv"

func sameAccount(providerID string, githubID int64) bool {
	return githubID > 0 && providerID == strconv.FormatInt(githubID, 10)
}

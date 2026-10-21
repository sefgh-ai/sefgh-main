//go:build solution

package lesson42

func reserveArgs(a attempt, revision string) (map[string]string, error) {
	if revision == "" || a.requestID == "" || a.endpoint != "public-search" {
		return nil, errInput
	}
	return map[string]string{
		"p_selector":     a.selector,
		"p_verifier_hex": a.verifier,
		"p_request_id":   a.requestID,
		"p_endpoint":     a.endpoint,
		"p_revision":     revision,
	}, nil
}

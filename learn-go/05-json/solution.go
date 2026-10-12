//go:build solution

package lesson05

import "encoding/json"

type rateLimit struct {
	Remaining *string `json:"remaining"`
	Reset     *string `json:"reset"`
}

type errorReply struct {
	Error     string     `json:"error"`
	RateLimit *rateLimit `json:"rate_limit,omitempty"`
}

func totalCount(body []byte) (int, error) {
	var reply struct {
		TotalCount int `json:"total_count"`
	}
	if err := json.Unmarshal(body, &reply); err != nil {
		return 0, err
	}
	return reply.TotalCount, nil
}

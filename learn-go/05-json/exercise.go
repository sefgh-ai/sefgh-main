//go:build !solution

package lesson05

// rateLimit is GitHub's rate-limit state. A nil pointer is written as null.
type rateLimit struct {
	Remaining *string // TODO: add a tag so JSON calls this field "remaining"
	Reset     *string // TODO: "reset"
}

// errorReply is what the API sends when something goes wrong.
type errorReply struct {
	Error     string     // TODO: "error"
	RateLimit *rateLimit // TODO: "rate_limit", and left out completely when nil
}

// totalCount reads the "total_count" number out of a JSON body such as
//
//	{"total_count": 42, "items": []}
//
// It returns an error when the body is not valid JSON.
func totalCount(body []byte) (int, error) {
	// TODO: declare a small struct with one tagged field, then use
	// json.Unmarshal(body, &yourStruct). You will need to import
	// "encoding/json" at the top of this file.
	return 0, nil
}

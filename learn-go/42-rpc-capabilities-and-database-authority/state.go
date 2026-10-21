package lesson42

import "errors"

var errInput = errors.New("invalid reservation")

type attempt struct {
	selector, verifier, requestID, endpoint string
	owner, requestedAt                      string
	perOwner                                int
}

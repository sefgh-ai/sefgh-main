//go:build solution

package lesson36

import "strings"

func targetOf(rest string) string {
	if fn, isRPC := strings.CutPrefix(rest, "rpc/"); isRPC {
		name, _, _ := strings.Cut(fn, "/")
		return "rpc/" + name
	}
	name, _, _ := strings.Cut(rest, "/")
	return name
}

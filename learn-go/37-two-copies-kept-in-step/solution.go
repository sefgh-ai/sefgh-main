//go:build solution

package lesson37

import "strings"

func sources(policy, name string) []string {
	for _, directive := range strings.Split(policy, ";") {
		words := strings.Fields(directive)
		if len(words) > 0 && words[0] == name {
			return words[1:]
		}
	}
	return nil
}

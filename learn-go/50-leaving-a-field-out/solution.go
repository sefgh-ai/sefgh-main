//go:build solution

package lesson50

import (
	"fmt"
	"strings"
)

func reasoningEffort(setting, preset string) (string, error) {
	switch effort := strings.ToLower(strings.TrimSpace(setting)); effort {
	case "":
		return preset, nil
	case "default":
		return "", nil
	case "none", "minimal", "low", "medium", "high", "xhigh":
		return effort, nil
	default:
		return "", fmt.Errorf("%q is not a reasoning effort", setting)
	}
}

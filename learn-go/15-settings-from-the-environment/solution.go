//go:build solution

package lesson15

import (
	"fmt"
	"strconv"
	"time"
)

func fromMap(values map[string]string) func(string) string {
	return func(name string) string {
		return values[name]
	}
}

func timeoutFrom(getenv func(string) string) (time.Duration, error) {
	text := getenv("TIMEOUT_SECONDS")
	if text == "" {
		return defaultTimeout, nil
	}
	n, err := strconv.Atoi(text)
	if err != nil || n < 1 || n > 60 {
		return 0, fmt.Errorf("TIMEOUT_SECONDS must be a whole number from 1 to 60, got %q", text)
	}
	return time.Duration(n) * time.Second, nil
}

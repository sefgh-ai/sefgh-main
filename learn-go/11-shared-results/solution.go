//go:build solution

package lesson11

import "context"

func waitResult(ctx context.Context, done <-chan struct{}, result *sharedResult) (string, error) {
	select {
	case <-done:
		if err := ctx.Err(); err != nil {
			return "", err
		}
		return result.value, result.err
	case <-ctx.Done():
		return "", ctx.Err()
	}
}

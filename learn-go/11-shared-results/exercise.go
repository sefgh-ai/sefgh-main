//go:build !solution

package lesson11

import "context"

func waitResult(ctx context.Context, done <-chan struct{}, result *sharedResult) (string, error) {
	// TODO: Wait for completion or cancellation. Preserve the result's error.
	// If both are ready, cancellation wins. Do not close the producer's channel.
	return "", nil
}

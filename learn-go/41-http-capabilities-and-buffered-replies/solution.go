//go:build solution

package lesson41

func appendBounded(buffer *[]byte, limit int, chunk []byte) (int, error) {
	if limit < 0 || len(*buffer) > limit || len(chunk) > limit-len(*buffer) {
		return 0, errTooLarge
	}
	*buffer = append(*buffer, chunk...)
	return len(chunk), nil
}

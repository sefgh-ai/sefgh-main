package lesson11

// The producer fills these fields before closing its completion channel.
type sharedResult struct {
	value string
	err   error
}

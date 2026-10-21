//go:build !solution

package lesson44

func scan(rows []receipt, limit int, store completer) (progress, error) {
	// TODO: inspect at most limit rows. Unknown receipts count as missing.
	// Return before advancing past a completion that failed.
	return progress{}, nil
}

//go:build solution

package lesson44

import "errors"

func scan(rows []receipt, limit int, store completer) (progress, error) {
	result := progress{more: len(rows) > 0}
	if limit < 1 || store == nil {
		return result, errors.New("choose a positive limit and a store")
	}
	for i, row := range rows {
		if i == limit {
			return result, nil
		}
		if row.known {
			if err := store.Complete(row.id); err != nil {
				return result, err
			}
			result.completed++
		} else {
			result.missing++
		}
		result.scanned++
	}
	result.more = false
	return result, nil
}

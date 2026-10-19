// Package lesson34 counts search history rows by source, as count does in
// backend/internal/searchhistory/handler.go.
package lesson34

// Counts is getSearchHistoryCount's answer.
type Counts struct {
	Total, Search, Chat int
}

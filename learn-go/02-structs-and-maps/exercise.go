//go:build !solution

package lesson02

// lookupSort returns the option for name. When the name is not in
// sortOptions it returns the "all" option.
func lookupSort(name string) sortOption {
	// TODO: use the "comma ok" form: option, ok := sortOptions[name]
	return sortOption{}
}

// countKnown returns how many of the names are in sortOptions.
func countKnown(names []string) int {
	// TODO: loop with: for _, name := range names { ... }
	return 0
}

// describe returns a short text for an option:
//
//	sortOption{sort: "stars", order: "desc"}  ->  "stars desc"
//	sortOption{sort: "", order: "desc"}       ->  "best match"
func describe(option sortOption) string {
	// TODO
	return ""
}

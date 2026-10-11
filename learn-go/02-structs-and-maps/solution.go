//go:build solution

package lesson02

func lookupSort(name string) sortOption {
	option, ok := sortOptions[name]
	if !ok {
		return sortOptions["all"]
	}
	return option
}

func countKnown(names []string) int {
	count := 0
	for _, name := range names {
		if _, ok := sortOptions[name]; ok {
			count++
		}
	}
	return count
}

func describe(option sortOption) string {
	if option.sort == "" {
		return "best match"
	}
	return option.sort + " " + option.order
}

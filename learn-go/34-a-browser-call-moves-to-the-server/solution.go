//go:build solution

package lesson34

func countSources(rows []any) Counts {
	counts := Counts{Total: len(rows)}
	for _, row := range rows {
		object, isObject := row.(map[string]any)
		if !isObject {
			continue
		}
		switch source, _ := object["source"].(string); source {
		case "search":
			counts.Search++
		case "chat":
			counts.Chat++
		}
	}
	return counts
}

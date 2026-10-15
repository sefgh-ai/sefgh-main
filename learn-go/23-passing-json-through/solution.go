//go:build solution

package lesson23

func pick(fields []Field, names []string) []Field {
	byName := map[string]Field{}
	for _, field := range fields {
		byName[field.Name] = field
	}
	var out []Field
	for _, name := range names {
		if field, present := byName[name]; present {
			out = append(out, field)
		}
	}
	return out
}

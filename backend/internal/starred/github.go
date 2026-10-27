package starred

import "github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/jscompat"

// summaryFields are the public fields the starred page shows, in the
// order the Next.js handler writes them.
var summaryFields = []string{"description", "stargazers_count", "forks_count", "language", "topics", "updated_at"}

// summary is repo_data: the fields GitHub sent, in that order. A field
// GitHub left out is left out here too, as JSON.stringify leaves out
// undefined.
func summary(fields []jscompat.Field) []jscompat.Field {
	byName := map[string]jscompat.Field{}
	for _, field := range fields {
		byName[field.Name] = field
	}
	var out []jscompat.Field
	for _, name := range summaryFields {
		if field, present := byName[name]; present {
			out = append(out, field)
		}
	}
	return out
}

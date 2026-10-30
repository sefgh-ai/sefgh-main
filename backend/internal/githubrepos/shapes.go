package githubrepos

import "math"

func nonemptyText(value any) bool {
	text, ok := value.(string)
	return ok && text != ""
}

func wholeCount(value any) bool {
	n, ok := value.(float64)
	return ok && n >= 0 && math.Trunc(n) == n
}

// repositoryShape checks the identity fields used by repository pages. Other
// known display fields are optional, but malformed values must not reach them.
func repositoryShape(value any) (map[string]any, bool) {
	fields, ok := value.(map[string]any)
	owner, _ := fields["owner"].(map[string]any)
	id, _ := fields["id"].(float64)
	if !ok || !wholeCount(fields["id"]) || id == 0 || !nonemptyText(fields["name"]) ||
		!nonemptyText(fields["full_name"]) || !nonemptyText(owner["login"]) || !nonemptyText(fields["html_url"]) {
		return nil, false
	}
	for _, name := range []string{"stargazers_count", "forks_count", "open_issues_count", "watchers_count", "size"} {
		if value, present := fields[name]; present && !wholeCount(value) {
			delete(fields, name)
		}
	}
	for _, name := range []string{"description", "language", "homepage"} {
		if value, present := fields[name]; present && value != nil {
			if _, text := value.(string); !text {
				delete(fields, name)
			}
		}
	}
	if value, present := fields["license"]; present && value != nil {
		if _, object := value.(map[string]any); !object {
			delete(fields, "license")
		}
	}
	if value, present := fields["topics"]; present {
		if list, array := value.([]any); array {
			topics := make([]any, 0, len(list))
			for _, topic := range list {
				if _, text := topic.(string); text {
					topics = append(topics, topic)
				}
			}
			fields["topics"] = topics
		} else {
			delete(fields, "topics")
		}
	}
	return fields, true
}

func languageShape(value any) (map[string]any, bool) {
	fields, ok := value.(map[string]any)
	if !ok {
		return nil, false
	}
	for name, count := range fields {
		if name == "" || !wholeCount(count) {
			delete(fields, name)
		}
	}
	return fields, true
}

func contentKind(value any) bool {
	switch value {
	case "file", "dir", "symlink", "submodule":
		return true
	}
	return false
}

func contentsShape(value any) (any, bool) {
	if list, ok := value.([]any); ok {
		entries := make([]any, 0, len(list))
		for _, item := range list {
			entry, object := item.(map[string]any)
			if object && nonemptyText(entry["name"]) && contentKind(entry["type"]) {
				entries = append(entries, entry)
			}
		}
		return entries, true
	}
	entry, ok := value.(map[string]any)
	if !ok {
		return nil, false
	}
	switch entry["type"] {
	case "file":
		_, content := entry["content"].(string)
		_, encoding := entry["encoding"].(string)
		return entry, content && encoding
	case "symlink":
		return entry, nonemptyText(entry["target"])
	case "submodule":
		return entry, nonemptyText(entry["submodule_git_url"])
	}
	return nil, false
}

//go:build solution

package lesson25

func savedBy(rows []any, userID string) (saved, ok bool) {
	for _, row := range rows {
		if row == nil {
			return false, false
		}
		object, _ := row.(map[string]any)
		if id, isText := object["user_id"].(string); isText && id == userID {
			return true, true
		}
	}
	return false, true
}

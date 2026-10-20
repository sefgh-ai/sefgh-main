//go:build solution

package lesson40

func take(handle *oneTimeValue) (string, bool) {
	if handle == nil || handle.state == nil {
		return "", false
	}
	handle.state.mu.Lock()
	defer handle.state.mu.Unlock()
	if handle.state.value == "" {
		return "", false
	}
	value := handle.state.value
	handle.state.value = ""
	return value, true
}

//go:build !solution

package lesson50

// reasoningEffort decides the reasoning_effort the AI routes send.
// setting is what SEFGH_AI_REASONING_EFFORT holds; preset is the provider's
// own choice ("none" for OpenRouter, "" for the others).
func reasoningEffort(setting, preset string) (string, error) {
	// TODO: empty or spaces -> preset; "default" -> "";
	// none/minimal/low/medium/high/xhigh (any case, spaces trimmed) -> lower case;
	// anything else -> an error.
	return "", nil
}

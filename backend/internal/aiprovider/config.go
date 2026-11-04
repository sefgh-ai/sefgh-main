package aiprovider

import (
	"fmt"
	"strings"
)

// Provider is the chat-completions service the AI routes use. Every preset
// below speaks OpenAI's chat-completions format, so Client serves them all.
type Provider struct {
	Name     string
	Endpoint string
	Key      string
	Model    string
	// Reasoning is sent as reasoning_effort when it is not empty. A model
	// that reasons spends its answer budget on hidden thinking first, and the
	// search helpers allow only 100 tokens, so "none" keeps them for the
	// answer (R-214). Empty sends no field: the model decides.
	Reasoning string
}

// A preset is a provider with a free tier, found by the name of its key.
// Free model names change often; SEFGH_AI_MODEL overrides the default here.
type preset struct {
	name, keyName, endpoint, model, reasoning string
}

var presets = []preset{
	{"github", "GITHUB_TOKEN", DefaultEndpoint, "gpt-4o", ""},
	{"gemini", "GEMINI_API_KEY", "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", "gemini-2.5-flash", ""},
	{"groq", "GROQ_API_KEY", "https://api.groq.com/openai/v1/chat/completions", "llama-3.3-70b-versatile", ""},
	// OpenRouter's free models come and go, so it has no default model. Many
	// of them reason before they answer, so it asks for none (R-214).
	{"openrouter", "OPENROUTER_API_KEY", "https://openrouter.ai/api/v1/chat/completions", "", "none"},
}

// provider is the preset with its key read from the environment.
func (p preset) provider(getenv func(string) string) Provider {
	return Provider{p.name, p.endpoint, getenv(p.keyName), p.model, p.reasoning}
}

// FromEnv chooses the provider. SEFGH_AI_PROVIDER names one: a preset, or
// "custom" for any other OpenAI-compatible service (SEFGH_AI_URL and
// SEFGH_AI_KEY). Without it, the first preset whose key is set wins, in the
// order above, then custom. With nothing set it is GitHub Models without a
// key, as before: the AI routes answer with their fallbacks.
func FromEnv(getenv func(string) string) (Provider, error) {
	name := strings.ToLower(strings.TrimSpace(getenv("SEFGH_AI_PROVIDER")))
	custom := Provider{Name: "custom", Endpoint: getenv("SEFGH_AI_URL"), Key: getenv("SEFGH_AI_KEY")}
	var chosen Provider
	switch {
	case name == "custom":
		chosen = custom
	case name != "":
		found := false
		for _, p := range presets {
			if p.name == name {
				chosen, found = p.provider(getenv), true
			}
		}
		if !found {
			return Provider{}, fmt.Errorf("SEFGH_AI_PROVIDER %q is not github, gemini, groq, openrouter or custom", name)
		}
	default:
		for _, p := range presets {
			if getenv(p.keyName) != "" {
				chosen = p.provider(getenv)
				break
			}
		}
		if chosen.Name == "" && custom.Endpoint != "" && custom.Key != "" {
			chosen = custom
		}
		if chosen.Name == "" {
			return presets[0].provider(func(string) string { return "" }), nil
		}
	}
	if model := strings.TrimSpace(getenv("SEFGH_AI_MODEL")); model != "" {
		chosen.Model = model
	}
	reasoning, err := ReasoningEffort(getenv("SEFGH_AI_REASONING_EFFORT"), chosen.Reasoning)
	if err != nil {
		return Provider{}, err
	}
	chosen.Reasoning = reasoning
	if chosen.Key == "" {
		return Provider{}, fmt.Errorf("AI provider %s has no key", chosen.Name)
	}
	if chosen.Endpoint == "" {
		return Provider{}, fmt.Errorf("AI provider %s has no address: set SEFGH_AI_URL", chosen.Name)
	}
	if chosen.Model == "" {
		return Provider{}, fmt.Errorf("AI provider %s has no default model: set SEFGH_AI_MODEL", chosen.Name)
	}
	return chosen, nil
}

// ReasoningEffort reads SEFGH_AI_REASONING_EFFORT. Empty keeps the preset's
// own choice; "default" sends no field, which leaves it to the model; any of
// OpenAI's reasoning_effort values is sent as it is. Anything else is a
// setting error, reported like a missing key, not guessed at.
func ReasoningEffort(setting, preset string) (string, error) {
	switch effort := strings.ToLower(strings.TrimSpace(setting)); effort {
	case "":
		return preset, nil
	case "default":
		return "", nil
	case "none", "minimal", "low", "medium", "high", "xhigh":
		return effort, nil
	default:
		return "", fmt.Errorf("SEFGH_AI_REASONING_EFFORT %q is not none, minimal, low, medium, high, xhigh or default", setting)
	}
}

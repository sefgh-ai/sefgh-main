package aiprovider

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestFromEnvChoosesAProvider(t *testing.T) {
	gemini := "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
	cases := []struct {
		name string
		env  map[string]string
		want Provider
		bad  bool
	}{
		{"nothing set keeps GitHub Models without a key", nil, Provider{"github", DefaultEndpoint, "", "gpt-4o"}, false},
		{"GitHub token", map[string]string{"GITHUB_TOKEN": "g"}, Provider{"github", DefaultEndpoint, "g", "gpt-4o"}, false},
		{"Gemini key alone", map[string]string{"GEMINI_API_KEY": "k"}, Provider{"gemini", gemini, "k", "gemini-2.5-flash"}, false},
		{"GitHub wins without a choice", map[string]string{"GITHUB_TOKEN": "g", "GEMINI_API_KEY": "k"}, Provider{"github", DefaultEndpoint, "g", "gpt-4o"}, false},
		{"a named choice wins", map[string]string{"GITHUB_TOKEN": "g", "GEMINI_API_KEY": "k", "SEFGH_AI_PROVIDER": " Gemini "}, Provider{"gemini", gemini, "k", "gemini-2.5-flash"}, false},
		{"the model can be replaced", map[string]string{"GEMINI_API_KEY": "k", "SEFGH_AI_MODEL": "gemini-2.5-flash-lite"}, Provider{"gemini", gemini, "k", "gemini-2.5-flash-lite"}, false},
		{"custom service", map[string]string{"SEFGH_AI_URL": "https://ai.example/v1/chat/completions", "SEFGH_AI_KEY": "c", "SEFGH_AI_MODEL": "m"}, Provider{"custom", "https://ai.example/v1/chat/completions", "c", "m"}, false},
		{"OpenRouter needs a model", map[string]string{"OPENROUTER_API_KEY": "r"}, Provider{}, true},
		{"custom needs a model", map[string]string{"SEFGH_AI_URL": "https://ai.example", "SEFGH_AI_KEY": "c"}, Provider{}, true},
		{"a named choice needs its key", map[string]string{"SEFGH_AI_PROVIDER": "groq"}, Provider{}, true},
		{"an unknown name", map[string]string{"SEFGH_AI_PROVIDER": "nope", "GITHUB_TOKEN": "g"}, Provider{}, true},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got, err := FromEnv(func(name string) string { return c.env[name] })
			if (err != nil) != c.bad || got != c.want {
				t.Fatalf("got %+v, %v; want %+v, error %v", got, err, c.want, c.bad)
			}
		})
	}
}

// The client's model is used when a call names none.
func TestClientModelReachesTheRequest(t *testing.T) {
	var model string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var body struct{ Model string }
		_ = json.NewDecoder(r.Body).Decode(&body)
		model = body.Model
		w.Write([]byte(`{"choices":[{"message":{"content":"ok"}}]}`))
	}))
	defer server.Close()
	client := &Client{Endpoint: server.URL, Token: "k", Model: "gemini-2.5-flash"}
	if _, err := client.Generate(context.Background(), nil, Options{}); err != nil || model != "gemini-2.5-flash" {
		t.Fatalf("model %q, %v", model, err)
	}
	client.Model = ""
	if _, err := client.Generate(context.Background(), nil, Options{}); err != nil || model != "gpt-4o" {
		t.Fatalf("default model %q, %v", model, err)
	}
}

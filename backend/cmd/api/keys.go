package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/apikey"
)

// Policy validation runs before ListenAndServe, with its own startup bound.
// Requests separately reserve time for detached completion and recovery.
const keyBootstrapBudget = 5 * time.Second

func keysMux(logger *slog.Logger) http.Handler {
	if os.Getenv("SEFGH_KEYS_V1") != "1" {
		return unavailableKeys(http.StatusNotFound)
	}
	refuse := func(stage string) http.Handler {
		// Constructor failures can contain remote/configuration values. Only
		// fixed stage labels belong in this log; no error object or credential.
		logger.Error("API key runtime unavailable", "stage", stage)
		return unavailableKeys(http.StatusServiceUnavailable)
	}
	bearer := os.Getenv("SEFGH_KEYS_ACCOUNTANT_JWT")
	if bearer == "" {
		return refuse("configuration")
	}
	client, err := apikey.NewRPCClient(os.Getenv("NEXT_PUBLIC_SUPABASE_URL"), os.Getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY"))
	if err != nil {
		return refuse("configuration")
	}
	ctx, cancel := context.WithTimeout(context.Background(), keyBootstrapBudget)
	defer cancel()
	accounting, err := client.OpenAccounting(ctx, bearer)
	if err != nil {
		return refuse("policy")
	}
	execution, err := accounting.Executor(nil)
	if err != nil {
		return refuse("executor")
	}
	handler, err := apikey.NewHTTP(client.Sessions(), execution, apikey.HTTPOptions{
		GitHubURL:    envOr("GITHUB_API_URL", "https://api.github.com"),
		SaveRecovery: accounting.SaveRecovery,
	})
	if err != nil {
		return refuse("http")
	}
	return handler
}

func unavailableKeys(status int) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.WriteHeader(status)
		if status == http.StatusNotFound {
			_, _ = w.Write([]byte(`{"error":"Not found"}`))
		} else {
			_, _ = w.Write([]byte(`{"error":"Service unavailable"}`))
		}
	})
}

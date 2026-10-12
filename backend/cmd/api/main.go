// Command api runs the SEFGH Go backend: the API routes that have moved out
// of Next.js. See backend/README.md for configuration and the opt-in switch.
package main

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/githubrepos"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/githubsearch"
)

func main() {
	logger := slog.New(slog.NewTextHandler(os.Stderr, nil))
	if err := run(logger); err != nil {
		logger.Error("server stopped", "error", err)
		os.Exit(1)
	}
}

func run(logger *slog.Logger) error {
	addr := envOr("SEFGH_API_ADDR", "127.0.0.1:8787")

	mux := http.NewServeMux()
	githubrepos.New(&http.Client{Timeout: githubsearch.DefaultTimeout},
		envOr("GITHUB_API_URL", githubsearch.DefaultBaseURL), os.Getenv("GITHUB_TOKEN")).Register(mux)
	mux.Handle("GET /api/github/search", &githubsearch.Handler{
		Client:  &http.Client{Timeout: githubsearch.DefaultTimeout},
		BaseURL: envOr("GITHUB_API_URL", githubsearch.DefaultBaseURL),
		Token:   os.Getenv("GITHUB_TOKEN"),
		Logger:  logger,
	})
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		io.WriteString(w, `{"status":"ok"}`)
	})

	srv := &http.Server{
		Addr:              addr,
		Handler:           markBackend(mux),
		ReadHeaderTimeout: 5 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	// Stop cleanly on Ctrl+C or a termination signal from the host.
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	serveErr := make(chan error, 1)
	go func() {
		logger.Info("listening", "addr", addr)
		serveErr <- srv.ListenAndServe()
	}()

	select {
	case err := <-serveErr:
		return err
	case <-ctx.Done():
	}

	logger.Info("shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		return err
	}
	if err := <-serveErr; !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}

// securityHeaders are the headers next.config.mjs adds to every Next.js
// response. Next.js does not add them to responses it forwards here, so Go
// sends them itself. TestSecurityHeadersMatchNextConfig catches drift.
var securityHeaders = map[string]string{
	"Content-Security-Policy":   "default-src 'self'; img-src 'self' data: blob: https:; media-src 'self' data: blob: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co https://api.github.com https://vitals.vercel-insights.com https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';",
	"Referrer-Policy":           "strict-origin-when-cross-origin",
	"X-Content-Type-Options":    "nosniff",
	"X-Frame-Options":           "DENY",
	"Permissions-Policy":        "camera=(), microphone=(), geolocation=()",
	"Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
}

// markBackend adds the security headers and labels every response, so
// anyone can check which backend served a request while routes move
// between Next.js and Go.
func markBackend(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		for name, value := range securityHeaders {
			w.Header().Set(name, value)
		}
		w.Header().Set("X-Sefgh-Backend", "go")
		next.ServeHTTP(w, r)
	})
}

func envOr(name, fallback string) string {
	if v := os.Getenv(name); v != "" {
		return v
	}
	return fallback
}

// Command api runs the SEFGH Go backend: the API routes that have moved out
// of Next.js. See backend/README.md for configuration and the opt-in switch.
package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/activity"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/aichat"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/aienhance"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/ailimit"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/aiprovider"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/aisuggestions"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/githubaccess"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/githubcontributions"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/githubdevelopers"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/githublanguages"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/githubrepos"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/githubsearch"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/githubtrending"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/publictoken"
)

// writeTimeout is how long the server allows for writing one response. Every
// handler must finish inside it; githubrepos.DetailTimeout is the longest.
const writeTimeout = 30 * time.Second

func main() {
	logger := slog.New(slog.NewTextHandler(os.Stderr, nil))
	if err := run(logger); err != nil {
		logger.Error("server stopped", "error", err)
		os.Exit(1)
	}
}

// defaultAddr keeps the server reachable from this machine only. Whoever
// runs it for the public says so through SEFGH_API_ADDR or PORT.
const defaultAddr = "127.0.0.1:8787"

// listenAddr decides where the server listens. SEFGH_API_ADDR wins when it
// is set. Otherwise a hosting platform that hands the process a port in PORT
// gets that port on every network interface, which is what platforms expect.
// getenv is os.Getenv in the server and a stand-in in tests.
func listenAddr(getenv func(string) string) (string, error) {
	if addr := getenv("SEFGH_API_ADDR"); addr != "" {
		return addr, nil
	}
	port := getenv("PORT")
	if port == "" {
		return defaultAddr, nil
	}
	n, err := strconv.Atoi(port)
	if err != nil || n < 1 || n > 65535 {
		return "", fmt.Errorf("PORT must be a number from 1 to 65535, got %q", port)
	}
	return ":" + strconv.Itoa(n), nil
}

func run(logger *slog.Logger) error {
	addr, err := listenAddr(os.Getenv)
	if err != nil {
		return err
	}

	srv := &http.Server{
		Addr: addr, Handler: newHandler(logger), ReadHeaderTimeout: 5 * time.Second,
		WriteTimeout: writeTimeout, IdleTimeout: 60 * time.Second,
	}
	return serve(logger, srv, addr)
}

// newHandler builds everything the server serves, from the environment. The
// tests call it too, so the wiring they check is the wiring that runs:
// handlers for callers without credentials get no token at all, and a
// verified caller's handlers get only that caller's own token.
func newHandler(logger *slog.Logger) http.Handler {
	verifier := githubaccess.Verifier{
		SupabaseURL: os.Getenv("NEXT_PUBLIC_SUPABASE_URL"),
		SupabaseKey: os.Getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
		GitHubURL:   envOr("GITHUB_API_URL", githubsearch.DefaultBaseURL),
	}
	// Signed-out reads may use the server's public read token (QUOTA-001),
	// once GitHub has confirmed it can read only public data. A verified
	// caller's handlers never see it: they get the plain transport.
	public := &publictoken.Transport{
		Token:  os.Getenv("GITHUB_PUBLIC_READ_TOKEN"),
		Origin: publictoken.Origin(envOr("GITHUB_API_URL", githubsearch.DefaultBaseURL)),
		Logger: logger,
	}
	github := verifier.Wrap(githubMux(logger, "", public), func(token string) http.Handler { return githubMux(logger, token, nil) })
	// The AI routes have their own rules about who may call them, so they sit
	// beside the GitHub access check, not behind it.
	top := http.NewServeMux()
	top.Handle("/api/ai/", aiMux(logger, verifier))
	top.Handle("/api/activity", activityMux(logger, verifier))
	top.Handle("/", github)
	return markBackend(top)
}

// activityMux serves the caller's own activity. It asks the Supabase Data
// API as the caller, with their own token and the public key: no server
// credential is involved, so row-level security decides, as it does for
// the Next.js handler. GitHub credentials play no part, so it too sits
// beside the GitHub access check.
func activityMux(logger *slog.Logger, verifier githubaccess.Verifier) *http.ServeMux {
	mux := http.NewServeMux()
	mux.Handle("GET /api/activity", &activity.Handler{
		User:        verifier.User,
		Client:      &http.Client{Timeout: activity.Timeout},
		SupabaseURL: verifier.SupabaseURL,
		SupabaseKey: verifier.SupabaseKey,
		Logger:      logger,
	})
	return mux
}

// aiMux serves the AI routes. GITHUB_TOKEN is the credential for GitHub
// Models here, exactly as it is in src/lib/ai/github.js. It is sent to the
// models endpoint and never to a GitHub API route: githubMux above still gets
// no token for callers without credentials. verifier is used only for its
// Supabase half, to say who is calling chat.
func aiMux(logger *slog.Logger, verifier githubaccess.Verifier) *http.ServeMux {
	mux := http.NewServeMux()
	models := &aiprovider.Client{
		HTTP:     &http.Client{Timeout: aiprovider.Timeout},
		Endpoint: envOr("SEFGH_AI_MODELS_URL", aiprovider.DefaultEndpoint),
		Token:    os.Getenv("GITHUB_TOKEN"),
	}
	// One allowance per address, shared by the two search-box helpers.
	searchAllowance := ailimit.New(ailimit.Requests, ailimit.Window)
	mux.Handle("POST /api/ai/suggestions", &aisuggestions.Handler{
		Generate: func(ctx context.Context, messages []aiprovider.Message) (any, error) {
			return models.Generate(ctx, messages, aiprovider.Options{})
		},
		Limiter: searchAllowance,
		Logger:  logger,
	})
	mux.Handle("POST /api/ai/enhance-query", &aienhance.Handler{
		Client:       &http.Client{Timeout: aienhance.Timeout},
		OpenAIKey:    os.Getenv("OPENAI_API_KEY"),
		AnthropicKey: os.Getenv("ANTHROPIC_API_KEY"),
		OpenAIURL:    envOr("SEFGH_OPENAI_URL", aienhance.DefaultOpenAIURL),
		AnthropicURL: envOr("SEFGH_ANTHROPIC_URL", aienhance.DefaultAnthropicURL),
		Limiter:      searchAllowance,
		Logger:       logger,
	})
	// Chat is for signed-in users only: a Supabase bearer verified online,
	// and an allowance per user that is separate from the search helpers'.
	mux.Handle("POST /api/ai/chat", &aichat.Handler{
		SignIn:  verifier.SignedInUser,
		Models:  models,
		Limiter: ailimit.New(ailimit.Requests, ailimit.Window),
		Logger:  logger,
	})
	return mux
}

// Public settings never use GITHUB_TOKEN. Private muxes live for one request.
// transport carries every GitHub request; nil means Go's default. Only the
// public mux is given the public read token's transport.
func githubMux(logger *slog.Logger, token string, transport http.RoundTripper) *http.ServeMux {
	mux := http.NewServeMux()
	client := &http.Client{Timeout: githubsearch.DefaultTimeout, Transport: transport}
	if token != "" {
		client.CheckRedirect = func(*http.Request, []*http.Request) error { return errors.New("authenticated redirect refused") }
	}
	githublanguages.Register(mux)
	mux.Handle("GET /api/github/trending-developers", &githubdevelopers.Handler{
		Client:  &http.Client{Timeout: githubsearch.DefaultTimeout, Transport: transport},
		BaseURL: envOr("GITHUB_API_URL", githubdevelopers.DefaultBaseURL),
		Logger:  logger,
	})
	// Trending remains public-only, like its Next.js implementation. Never
	// pass the verified caller token or GITHUB_TOKEN to it. The public read
	// token, which can read only public data, may reach it through transport.
	mux.Handle("GET /api/github/trending", &githubtrending.Handler{
		Client:  &http.Client{Timeout: githubtrending.Timeout, Transport: transport},
		BaseURL: envOr("GITHUB_API_URL", githubtrending.DefaultBaseURL),
		Logger:  logger,
	})
	mux.Handle("GET /api/github/contributions", &githubcontributions.Handler{
		Client:  client,
		BaseURL: envOr("GITHUB_API_URL", githubcontributions.DefaultBaseURL),
		Token:   token,
		Logger:  logger,
	})
	repositories := githubrepos.New(client,
		envOr("GITHUB_API_URL", githubsearch.DefaultBaseURL), token)
	repositories.Logger = logger
	repositories.Register(mux)
	mux.Handle("GET /api/github/search", &githubsearch.Handler{
		Client:  client,
		BaseURL: envOr("GITHUB_API_URL", githubsearch.DefaultBaseURL),
		Token:   token,
		Logger:  logger,
	})
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		io.WriteString(w, `{"status":"ok"}`)
	})

	return mux
}

func serve(logger *slog.Logger, srv *http.Server, addr string) error {
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

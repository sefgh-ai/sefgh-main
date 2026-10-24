// reposync runs the Go port of the RepoSync worker. It writes to a database
// with a privileged key and spends GitHub allowance, so it refuses to start
// unless REPOSYNC_ENABLED=1: worker execution is gated until the owner
// approves a deployment (ADR 0002, decision of 2026-10-20).
package main

import (
	"flag"
	"fmt"
	"io"
	"log/slog"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/reposync"
)

const pollingInterval = 300 // seconds, as the original

func main() {
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	os.Exit(run(os.Args[1:], os.Getenv, stop, os.Stderr, reposync.Config{}))
}

// run takes its settings from getenv; base supplies anything tests replace.
func run(args []string, getenv func(string) string, signals <-chan os.Signal, errOut io.Writer, base reposync.Config) int {
	f := flag.NewFlagSet("reposync", flag.ContinueOnError)
	f.SetOutput(errOut)
	once := f.Bool("once", false, "process pending topics once, then exit")
	if err := f.Parse(args); err != nil || f.NArg() != 0 {
		return 2
	}
	if getenv("REPOSYNC_ENABLED") != "1" {
		fmt.Fprintln(errOut, "reposync: refusing to start. Running it writes to a database and spends GitHub allowance;"+
			" it is gated until the owner approves a deployment (docs/adr/0002-go-backend.md, 2026-10-20). Set REPOSYNC_ENABLED=1 only then.")
		return 2
	}
	list := func(name string) []string {
		var out []string
		for _, s := range strings.Split(getenv(name), ",") {
			if s = strings.TrimSpace(s); s != "" {
				out = append(out, s)
			}
		}
		return out
	}
	cfg := base
	cfg.SupabaseURL = strings.TrimRight(getenv("REPOSYNC_SUPABASE_URL"), "/")
	cfg.SupabaseKey = getenv("REPOSYNC_SUPABASE_SERVICE_KEY")
	cfg.Keys, cfg.KeyNames = list("REPOSYNC_GITHUB_KEYS"), list("REPOSYNC_GITHUB_KEY_NAMES")
	cfg.CostPerPoint, _ = strconv.ParseFloat(getenv("REPOSYNC_COST_PER_POINT_USD"), 64)
	if cfg.GraphQLURL == "" {
		cfg.GraphQLURL = "https://api.github.com/graphql"
	}
	if cfg.Logger == nil {
		cfg.Logger = slog.New(slog.NewTextHandler(errOut, nil))
	}
	if cfg.SupabaseURL == "" || cfg.SupabaseKey == "" || len(cfg.Keys) == 0 {
		fmt.Fprintln(errOut, "reposync: set REPOSYNC_SUPABASE_URL, REPOSYNC_SUPABASE_SERVICE_KEY and REPOSYNC_GITHUB_KEYS")
		return 2
	}
	sleep := cfg.Sleep
	if sleep == nil {
		sleep = time.Sleep
	}
	cfg.Sleep = sleep
	w, err := reposync.New(cfg)
	if err != nil {
		fmt.Fprintln(errOut, err)
		return 2
	}
	go func() {
		<-signals
		cfg.Logger.Warn("reposync: stop requested; finishing the current topic")
		w.Stop()
	}()

	stopped := w.Stopped
	for cycle := 1; !stopped(); cycle++ {
		w.SetCycle(cycle)
		stats, err := w.RunPending()
		if err != nil {
			// The original crashes here (R-190); its topic stays in_progress.
			cfg.Logger.Error("reposync: stopped", "error", err)
			return 1
		}
		cfg.Logger.Info("reposync: cycle done", "cycle", cycle, "topics", stats.TopicsProcessed, "saved", stats.TotalReposSaved)
		if *once || stopped() {
			break
		}
		for i := pollingInterval; i > 0 && !stopped(); i-- {
			sleep(time.Second)
		}
	}
	w.Flush()
	return 0
}

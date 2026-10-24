package reposync

// The monitoring state RepoSync keeps in shared_logger.app_state. Only what
// reaches the database is kept: the session snapshot copies these fields.

type rateLimit struct {
	Remaining      any `json:"remaining"`
	Limit          any `json:"limit"`
	ResetAt        any `json:"reset_at"`
	ResetInSeconds any `json:"reset_in_seconds"`
}

type keyInfo struct {
	Index           int    `json:"index"`
	Name            string `json:"name"`
	MaskedKey       string `json:"masked_key"`
	Remaining       any    `json:"remaining"`
	Limit           any    `json:"limit"`
	ResetAt         any    `json:"reset_at"`
	ResetInSeconds  any    `json:"reset_in_seconds"`
	IsExhausted     bool   `json:"is_exhausted"`
	TotalRequests   int    `json:"total_requests"`
	TotalCostPoints int    `json:"total_cost_points"`
	LastUsedAt      any    `json:"last_used_at"`
}

type keyUse struct {
	Requests   int `json:"requests"`
	CostPoints int `json:"cost_points"`
}

type apiStats struct {
	TotalRequests    int               `json:"total_requests"`
	TotalCostPoints  int               `json:"total_cost_points"`
	EstimatedCostUSD float64           `json:"estimated_cost_usd"`
	PerKey           map[string]keyUse `json:"per_key"`
}

type keysState struct {
	TotalKeys       int        `json:"total_keys"`
	CurrentKeyIndex int        `json:"current_key_index"`
	ExhaustedKeys   int        `json:"exhausted_keys"`
	KeysInfo        []*keyInfo `json:"keys_info"`
}

type state struct {
	status       string
	currentTopic any
	currentCycle int
	rateLimit    rateLimit
	keys         keysState
	stats        apiStats
	progress     map[string]any
	// Counted for the whole session, not per topic, as in the original.
	errors, retries, backoffs int
}

func newState() *state {
	return &state{
		status:    "idle",
		rateLimit: rateLimit{Remaining: 0, Limit: 5000},
		stats:     apiStats{PerKey: map[string]keyUse{}},
		progress: map[string]any{
			"current": 0, "total": 0, "percentage": 0, "saved": 0, "duplicates": 0, "requests": 0,
			"avg_page_time_sec": 0.0, "avg_cost_per_page": 0, "eta_seconds": nil, "eta_base_seconds": nil, "eta_wait_seconds": nil,
		},
	}
}

package apikey

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/githubaccess"
	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/supabaserest"
)

// RPCClient owns its transport and project settings, never a user or accountant
// bearer. It remains unregistered until the SQL and deployment gates are met.
type RPCClient struct{ rest supabaserest.Client }

func NewRPCClient(baseURL, publicKey string) (*RPCClient, error) {
	u, err := url.Parse(baseURL)
	if err != nil || u.Host == "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" || (u.Path != "" && u.Path != "/") {
		return nil, ErrPolicy
	}
	loopback := u.Hostname() == "localhost" || net.ParseIP(u.Hostname()).IsLoopback()
	if u.Scheme != "https" && !(u.Scheme == "http" && loopback) || publicKey == "" || strings.ContainsAny(publicKey, "\r\n") || strings.HasPrefix(publicKey, "sb_secret_") {
		return nil, ErrPolicy
	}
	// This is a configuration refusal, never JWT authentication. Auth/SQL still
	// verify credentials online. Reject a legacy service/user JWT as the public
	// project key too, rather than sending a privileged key accidentally.
	if parts := strings.Split(publicKey, "."); len(parts) == 3 {
		payload, err := base64.RawURLEncoding.DecodeString(parts[1])
		var claims struct {
			Role string `json:"role"`
		}
		if err != nil || json.Unmarshal(payload, &claims) != nil || claims.Role != "anon" {
			return nil, ErrPolicy
		}
	}
	return &RPCClient{rest: supabaserest.Client{URL: strings.TrimRight(baseURL, "/"), Key: publicKey, HTTP: ownedHTTPClient(supabaserest.Timeout)}}, nil
}

func (c *RPCClient) Sessions() SessionFactory {
	return func(ctx context.Context, bearer string) (string, Manager, error) {
		if c == nil {
			return "", nil, ErrUnavailable
		}
		if strings.HasPrefix(bearer, "sk_") {
			return "", nil, ErrOwner
		}
		request := &http.Request{Header: make(http.Header)}
		request.Header.Set("Authorization", "Bearer "+bearer)
		verifier := githubaccess.Verifier{SupabaseURL: c.rest.URL, SupabaseKey: c.rest.Key, Client: c.rest.HTTP}
		owner, status := verifier.SignedInUser(request.WithContext(ctx))
		if status != 200 {
			if status == 401 {
				return "", nil, ErrOwner
			}
			return "", nil, ErrUnavailable
		}
		if !ownerUUID(owner) {
			return "", nil, ErrUnavailable
		}
		return owner, ownerRPC{c, owner, bearer}, nil
	}
}

type ownerRPC struct {
	client        *RPCClient
	owner, bearer string
}

func (m ownerRPC) Format(f fmt.State, _ rune)   { _, _ = io.WriteString(f, "[owner RPC redacted]") }
func (m ownerRPC) MarshalJSON() ([]byte, error) { return nil, ErrUnavailable }

func (m ownerRPC) Issue(ctx context.Context, owner, name string, scopes []string) (Metadata, *Secret, error) {
	if owner != m.owner {
		return Metadata{}, nil, ErrOwner
	}
	name = strings.TrimSpace(name)
	if !utf8.ValidString(name) || strings.ContainsRune(name, 0) || name == "" || utf8.RuneCountInString(name) > 200 || len(scopes) != 1 || scopes[0] != "repo:read:public" {
		return Metadata{}, nil, ErrInput
	}
	var reply struct {
		Key    Metadata `json:"key"`
		Secret string   `json:"secret"`
	}
	err := m.client.call(ctx, m.bearer, "sefgh_key_issue", map[string]any{"p_name": name, "p_scopes": scopes}, &reply)
	if err != nil {
		return Metadata{}, nil, err
	}
	material, err := Parse(reply.Secret)
	if err != nil || !validMetadata(reply.Key, m.owner) || reply.Key.Selector != material.Selector || reply.Key.RevokedAt != nil {
		return Metadata{}, nil, ErrUnavailable
	}
	return copyMetadata(reply.Key), &Secret{state: &revealState{value: reply.Secret}}, nil
}
func (m ownerRPC) List(ctx context.Context, owner string) ([]Metadata, error) {
	if owner != m.owner {
		return nil, ErrOwner
	}
	ctx, cancel := context.WithTimeout(ctx, MaxHTTPBudget)
	defer cancel()
	rows := []Metadata{}
	var after *ownerCursor
	seen := map[string]bool{}
	for pages := 0; pages < 100; pages++ {
		var page struct {
			Items []Metadata   `json:"items"`
			Next  *ownerCursor `json:"next"`
		}
		args := map[string]any{"p_after_created": nil, "p_after_selector": nil}
		if after != nil {
			args["p_after_created"] = after.CreatedAt
			args["p_after_selector"] = after.Selector
		}
		if err := m.client.call(ctx, m.bearer, "sefgh_key_list", args, &page); err != nil {
			return nil, err
		}
		if page.Items == nil || len(page.Items) > 100 {
			return nil, ErrUnavailable
		}
		for _, row := range page.Items {
			if !validMetadata(row, m.owner) || seen[row.Selector] {
				return nil, ErrUnavailable
			}
			if after != nil && !(row.CreatedAt.Before(after.CreatedAt) || row.CreatedAt.Equal(after.CreatedAt) && row.Selector < after.Selector) {
				return nil, ErrUnavailable
			}
			seen[row.Selector] = true
			rows = append(rows, copyMetadata(row))
			after = &ownerCursor{row.CreatedAt, row.Selector}
		}
		if page.Next == nil {
			return rows, nil
		}
		if len(page.Items) != 100 || after == nil || !page.Next.CreatedAt.Equal(after.CreatedAt) || page.Next.Selector != after.Selector {
			return nil, ErrUnavailable
		}
	}
	// Keep the existing HTTP array contract, without a silent truncation. A
	// future paginated UI can use the underlying bounded owner RPC directly.
	return nil, ErrUnavailable
}

type ownerCursor struct {
	CreatedAt time.Time
	Selector  string
}

func (m ownerRPC) Revoke(ctx context.Context, owner, selector string) error {
	if owner != m.owner {
		return ErrOwner
	}
	if !canonicalSelector(selector) {
		return ErrInput
	}
	return m.client.call(ctx, m.bearer, "sefgh_key_revoke", map[string]string{"p_selector": selector}, nil)
}
func ownerUUID(s string) bool {
	if len(s) != 36 {
		return false
	}
	for i, c := range s {
		if i == 8 || i == 13 || i == 18 || i == 23 {
			if c != '-' {
				return false
			}
		} else if !(c >= '0' && c <= '9' || c >= 'a' && c <= 'f') {
			return false
		}
	}
	return s != "00000000-0000-0000-0000-000000000000"
}
func validMetadata(m Metadata, owner string) bool {
	return ownerUUID(m.Owner) && (owner == "" || owner == m.Owner) && canonicalSelector(m.Selector) && m.Prefix == Prefix+m.Selector+"." && utf8.ValidString(m.Name) && !strings.ContainsRune(m.Name, 0) && strings.TrimSpace(m.Name) == m.Name && len(m.Name) > 0 && utf8.RuneCountInString(m.Name) <= 200 && len(m.Scopes) == 1 && m.Scopes[0] == "repo:read:public" && !m.CreatedAt.IsZero() && m.ExpiresAt.After(m.CreatedAt) && (m.RevokedAt == nil || !m.RevokedAt.Before(m.CreatedAt))
}

// Only fixed RPC names are used by capabilities. No response/error is logged,
// and an ambiguous write is never retried to retrieve an issuance secret.
func (c *RPCClient) call(ctx context.Context, bearer, name string, args, out any) error {
	if c == nil || bearer == "" {
		return ErrUnavailable
	}
	payload, err := json.Marshal(args)
	if err != nil {
		return ErrUnavailable
	}
	status, body, err := c.rest.RPC(ctx, bearer, name, payload)
	if err != nil {
		return ErrUnavailable
	}
	if status < 200 || status > 299 {
		var failure struct {
			Code    string          `json:"code"`
			Message string          `json:"message"`
			Details json.RawMessage `json:"details"`
			Hint    json.RawMessage `json:"hint"`
		}
		// Unknown or malformed errors are deliberately collapsed. No database text
		// (which can include sensitive arguments) enters a returned error.
		if json.Unmarshal(body, &failure) == nil && failure.Code == "P0001" {
			switch failure.Message {
			case "SEFGH_KEY_OWNER":
				return ErrOwner
			case "SEFGH_KEY_INPUT":
				return ErrInput
			case "SEFGH_KEY_ACTIVE_LIMIT":
				return ErrActiveLimit
			case "SEFGH_KEY_DENIED":
				return ErrDenied
			case "SEFGH_KEY_LIMIT":
				return ErrLimit
			case "SEFGH_KEY_REPLAY":
				return ErrReplay
			case "SEFGH_KEY_ACCOUNTING":
				return ErrAccounting
			}
		}
		return ErrUnavailable
	}
	if out == nil {
		if len(strings.TrimSpace(string(body))) == 0 || strings.TrimSpace(string(body)) == "null" {
			return nil
		}
		return ErrUnavailable
	}
	return strictRPCJSON(body, out)
}

package lesson21

import (
	"io"
	"net/http"
	"strings"
	"testing"
)

// recorder stands in for the network. It remembers the User-Agent of every
// request that reaches it.
type recorder struct{ agents []string }

func (r *recorder) RoundTrip(req *http.Request) (*http.Response, error) {
	r.agents = append(r.agents, req.Header.Get("User-Agent"))
	return &http.Response{StatusCode: 200, Header: http.Header{}, Body: io.NopCloser(strings.NewReader("ok"))}, nil
}

func TestAgentIsAddedWhenMissing(t *testing.T) {
	network := &recorder{}
	client := &http.Client{Transport: &agentTransport{Base: network, Agent: "SEFGH-lesson"}}
	resp, err := client.Get("https://example.test/")
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	resp.Body.Close()
	if len(network.agents) != 1 || network.agents[0] != "SEFGH-lesson" {
		t.Errorf("the network saw User-Agent %q, want [SEFGH-lesson]", network.agents)
	}
}

func TestAnAgentOfItsOwnIsKept(t *testing.T) {
	network := &recorder{}
	transport := &agentTransport{Base: network, Agent: "SEFGH-lesson"}
	req, _ := http.NewRequest("GET", "https://example.test/", nil)
	req.Header.Set("User-Agent", "mine")
	if _, err := transport.RoundTrip(req); err != nil {
		t.Fatalf("RoundTrip: %v", err)
	}
	if len(network.agents) != 1 || network.agents[0] != "mine" {
		t.Errorf("the network saw User-Agent %q, want [mine]", network.agents)
	}
}

// The rule for every RoundTripper: the caller's request is not changed.
func TestTheCallersRequestIsNotChanged(t *testing.T) {
	transport := &agentTransport{Base: &recorder{}, Agent: "SEFGH-lesson"}
	req, _ := http.NewRequest("GET", "https://example.test/", nil)
	if _, err := transport.RoundTrip(req); err != nil {
		t.Fatalf("RoundTrip: %v", err)
	}
	if got := req.Header.Get("User-Agent"); got != "" {
		t.Errorf("the caller's request now has User-Agent %q; set it on a clone instead", got)
	}
}

func TestEveryRequestIsCounted(t *testing.T) {
	transport := &agentTransport{Base: &recorder{}, Agent: "SEFGH-lesson"}
	plain, _ := http.NewRequest("GET", "https://example.test/a", nil)
	own, _ := http.NewRequest("GET", "https://example.test/b", nil)
	own.Header.Set("User-Agent", "mine")
	transport.RoundTrip(plain)
	transport.RoundTrip(own)
	if transport.sent != 2 {
		t.Errorf("sent = %d after two requests, want 2", transport.sent)
	}
}

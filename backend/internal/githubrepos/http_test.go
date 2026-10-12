package githubrepos

import (
	"bufio"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"net/textproto"
	"net/url"
	"reflect"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

// Run every fixture over sockets as well as the in-memory transport. This
// catches URL escaping differences that a direct handler call cannot see.
func TestContractsOverHTTP(t *testing.T) {
	for _, tc := range loadFixtures(t) {
		t.Run(tc.ID, func(t *testing.T) {
			var calls atomic.Int32
			address, closeUpstream := rawUpstream(t, func(target string, header http.Header) (*http.Response, error) {
				i := int(calls.Add(1)) - 1
				if i >= len(tc.Calls) {
					t.Error("unexpected upstream call")
					return nil, io.EOF
				}
				want := tc.Calls[i]
				wantTarget := strings.TrimPrefix(want.URL, defaultBaseURL)
				if target != wantTarget {
					t.Errorf("wire target %q want %q", target, wantTarget)
				}
				for k, v := range want.Headers {
					if header.Get(k) != v {
						t.Errorf("header %s %q want %q", k, header.Get(k), v)
					}
				}
				if want.Headers["Authorization"] == "" && header.Get("Authorization") != "" {
					t.Error("unexpected credential")
				}
				if want.NetworkError {
					return nil, io.EOF
				}
				responseHeaders := http.Header{}
				for k, v := range want.ResponseHeaders {
					responseHeaders.Set(k, v)
				}
				body := string(want.Body)
				if want.RawBody != nil {
					body = *want.RawBody
				}
				return &http.Response{StatusCode: want.Status, Header: responseHeaders, Body: io.NopCloser(strings.NewReader(body)), ContentLength: int64(len(body)), ProtoMajor: 1, ProtoMinor: 1, Close: true}, nil
			})
			defer closeUpstream()
			local, _ := url.Parse(address)
			// Keep absolute GitHub URLs in the fixture replies. Redirect the socket
			// destination in the test transport only; no request can leave localhost.
			transport := &http.Transport{DisableKeepAlives: true}
			defer transport.CloseIdleConnections()
			client := &http.Client{Timeout: time.Second, Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
				clone := req.Clone(req.Context())
				u := *req.URL
				u.Scheme = local.Scheme
				u.Host = local.Host
				clone.URL = &u
				return transport.RoundTrip(clone)
			})}
			mux := http.NewServeMux()
			New(client, defaultBaseURL, tc.Token).Register(mux)
			api := httptest.NewServer(mux)
			defer api.Close()
			res, err := http.Get(api.URL + tc.Request)
			if err != nil {
				t.Fatal(err)
			}
			defer res.Body.Close()
			b, err := io.ReadAll(res.Body)
			if err != nil {
				t.Fatal(err)
			}
			var got, want any
			if err = json.Unmarshal(b, &got); err != nil {
				t.Fatalf("not JSON: %s", b)
			}
			if err = json.Unmarshal(tc.Expect.Body, &want); err != nil {
				t.Fatal(err)
			}
			if res.StatusCode != tc.Expect.Status || !reflect.DeepEqual(got, want) {
				t.Errorf("status %d body %s; want %d %s", res.StatusCode, b, tc.Expect.Status, tc.Expect.Body)
			}
			if int(calls.Load()) != len(tc.Calls) {
				t.Errorf("calls %d want %d", calls.Load(), len(tc.Calls))
			}
		})
	}
}

// Go's HTTP server rejects a literal invalid percent escape before routing.
// A raw fixture server lets the test observe those bytes too, just as Node
// fetch sends them, without relying on Go's inbound URL parser.
func rawUpstream(t *testing.T, respond func(string, http.Header) (*http.Response, error)) (string, func()) {
	t.Helper()
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	done := make(chan struct{})
	go func() {
		defer close(done)
		for {
			conn, err := listener.Accept()
			if err != nil {
				return
			}
			func() {
				defer conn.Close()
				_ = conn.SetDeadline(time.Now().Add(3 * time.Second))
				reader := textproto.NewReader(bufio.NewReader(conn))
				line, err := reader.ReadLine()
				if err != nil {
					return
				}
				parts := strings.SplitN(line, " ", 3)
				if len(parts) != 3 {
					t.Errorf("invalid request line %q", line)
					return
				}
				headers, err := reader.ReadMIMEHeader()
				if err != nil {
					t.Error(err)
					return
				}
				response, err := respond(parts[1], http.Header(headers))
				if err != nil {
					return
				}
				_ = response.Write(conn)
				_ = response.Body.Close()
			}()
		}
	}()
	return "http://" + listener.Addr().String(), func() { _ = listener.Close(); <-done }
}

func TestSummaryCacheIsConnectedAndScopedToHandler(t *testing.T) {
	var calls atomic.Int32
	client := &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		calls.Add(1)
		return &http.Response{StatusCode: 200, Header: http.Header{}, Body: io.NopCloser(strings.NewReader(`{"id":1}`))}, nil
	})}
	for _, token := range []string{"first", "second"} {
		mux := http.NewServeMux()
		New(client, defaultBaseURL, token).Register(mux)
		for _, target := range []string{"/api/github/repo?owner=o&name=a%2F.%2Fb", "/api/github/repo?owner=o&name=a/b"} {
			rec := httptest.NewRecorder()
			mux.ServeHTTP(rec, httptest.NewRequest("GET", target, nil))
			if rec.Code != 200 {
				t.Fatal(rec.Body.String())
			}
		}
	}
	if calls.Load() != 2 {
		t.Fatalf("%d calls; want one per handler", calls.Load())
	}
}

func TestContentsDoesNotCache(t *testing.T) {
	var calls atomic.Int32
	client := &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		calls.Add(1)
		return &http.Response{StatusCode: 200, Header: http.Header{}, Body: io.NopCloser(strings.NewReader(`[]`))}, nil
	})}
	mux := http.NewServeMux()
	New(client, defaultBaseURL, "").Register(mux)
	for range 2 {
		mux.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest("GET", "/api/github/contents/o/r", nil))
	}
	if calls.Load() != 2 {
		t.Fatal("contents unexpectedly cached")
	}
}

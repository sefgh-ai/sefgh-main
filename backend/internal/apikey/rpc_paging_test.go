package apikey

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestRPCPagingCrossesLostReceiptAndOwnerHistoryPages(t *testing.T) {
	owner := "11111111-1111-4111-8111-111111111111"
	at := time.Date(2026, 10, 21, 0, 0, 0, 0, time.UTC)
	listCalls, pendingCalls := 0, 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var args map[string]json.RawMessage
		_ = json.NewDecoder(r.Body).Decode(&args)
		switch r.URL.Path {
		case "/rest/v1/rpc/sefgh_key_list":
			listCalls++
			if r.Header.Get("Authorization") != "Bearer user-only" || len(args) != 2 {
				t.Error("wrong owner capability/args")
			}
			high := 104
			var selector string
			if string(args["p_after_selector"]) != "null" {
				_ = json.Unmarshal(args["p_after_selector"], &selector)
				if selector != "0000000000000005" {
					t.Error("owner cursor", selector)
				}
				high = 4
			}
			rows := []Metadata{}
			for i := high; i >= 0 && len(rows) < 100; i-- {
				id := fmt.Sprintf("%016d", i)
				rows = append(rows, Metadata{id, owner, "Test", Prefix + id + ".", []string{"repo:read:public"}, at, at.Add(time.Hour), nil})
			}
			var next *ownerCursor
			if high == 104 {
				last := rows[len(rows)-1]
				next = &ownerCursor{last.CreatedAt, last.Selector}
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"items": rows, "next": next})
		case "/rest/v1/rpc/sefgh_key_pending":
			pendingCalls++
			if r.Header.Get("Authorization") != "Bearer accountant-only" || len(args) != 2 {
				t.Error("wrong accounting capability/args")
			}
			low := 0
			var requestID string
			if string(args["p_after_request"]) != "null" {
				_ = json.Unmarshal(args["p_after_request"], &requestID)
				if requestID != "pending-099" {
					t.Error("pending cursor", requestID)
				}
				low = 100
			}
			rows := []PendingAttempt{}
			for i := low; i < 105 && len(rows) < 100; i++ {
				reservation := Reservation{fmt.Sprintf("pending-%03d", i), "abcdefghijklmnop", owner, "public-search", at}
				row := PendingAttempt{Reservation: reservation}
				if i == 104 {
					row.Receipt = &Completion{reservation, "failure", 500, at.Add(time.Second)}
				}
				rows = append(rows, row)
			}
			var next *PendingCursor
			if low == 0 {
				last := rows[len(rows)-1].Reservation
				next = &PendingCursor{last.StartedAt, last.RequestID}
			}
			_ = json.NewEncoder(w).Encode(PendingPage{rows, next})
		default:
			t.Error("wrong RPC", r.URL.Path)
			w.WriteHeader(500)
		}
	}))
	defer server.Close()
	client, _ := NewRPCClient(server.URL, "public-fixture")
	manager := ownerRPC{client, owner, "user-only"}
	keys, err := manager.List(context.Background(), owner)
	if err != nil || len(keys) != 105 || listCalls != 2 {
		t.Fatal("owner pages", err, len(keys), listCalls)
	}
	store := &RPCAccounting{client: client, bearer: "accountant-only"}
	first, err := store.Pending(context.Background(), nil)
	if err != nil || len(first.Items) != 100 || first.Next == nil {
		t.Fatal("first pending page", err)
	}
	second, err := store.Pending(context.Background(), first.Next)
	if err != nil || len(second.Items) != 5 || second.Next != nil || second.Items[4].Receipt == nil || pendingCalls != 2 {
		t.Fatal("later recovery starved", err)
	}
}

func TestRPCPagingRefusesRepeatedCursor(t *testing.T) {
	at := time.Date(2026, 10, 21, 0, 0, 0, 0, time.UTC)
	reservation := Reservation{"pending", "abcdefghijklmnop", "11111111-1111-4111-8111-111111111111", "public-search", at}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(PendingPage{Items: []PendingAttempt{{Reservation: reservation}}})
	}))
	defer server.Close()
	client, _ := NewRPCClient(server.URL, "public-fixture")
	store := &RPCAccounting{client: client, bearer: "accountant"}
	if _, err := store.Pending(context.Background(), &PendingCursor{at, "pending"}); err != ErrUnavailable {
		t.Fatal("page failed to progress", err)
	}
}

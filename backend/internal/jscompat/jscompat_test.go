package jscompat

import (
	"reflect"
	"testing"
)

// Expected values below were produced by Node.js 21 (encodeURIComponent and
// URLSearchParams), not written by hand.

func TestEncodeURIComponent(t *testing.T) {
	tests := []struct{ in, want string }{
		{
			" !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~",
			"%20!%22%23%24%25%26'()*%2B%2C-.%2F0123456789%3A%3B%3C%3D%3E%3F%40ABCDEFGHIJKLMNOPQRSTUVWXYZ%5B%5C%5D%5E_%60abcdefghijklmnopqrstuvwxyz%7B%7C%7D~",
		},
		{"日本", "%E6%97%A5%E6%9C%AC"},
		{"é", "%C3%A9"},
		{"\x00\t\n", "%00%09%0A"},
		{"a b+c&d=e", "a%20b%2Bc%26d%3De"},
		{"😀", "%F0%9F%98%80"},
		{"", ""},
	}
	for _, tt := range tests {
		if got := EncodeURIComponent(tt.in); got != tt.want {
			t.Errorf("EncodeURIComponent(%q) = %q, want %q", tt.in, got, tt.want)
		}
	}
}

// Each answer was produced by new URLSearchParams({ x: in }).toString() in
// Node 21, without the leading "x=".
func TestFormEncode(t *testing.T) {
	tests := []struct{ in, want string }{
		{
			"\x00\x1f !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~\x7f",
			"%00%1F+%21%22%23%24%25%26%27%28%29*%2B%2C-.%2F0123456789%3A%3B%3C%3D%3E%3F%40ABCDEFGHIJKLMNOPQRSTUVWXYZ%5B%5C%5D%5E_%60abcdefghijklmnopqrstuvwxyz%7B%7C%7D%7E%7F",
		},
		{"", ""},
		{" ", "+"},
		{"+", "%2B"},
		{"é", "%C3%A9"},
		{"☕", "%E2%98%95"},
		{"😀", "%F0%9F%98%80"},
		{"a b&c=d+e/é*~'()!", "a+b%26c%3Dd%2Be%2F%C3%A9*%7E%27%28%29%21"},
		{"eq.9c1e5d2a", "eq.9c1e5d2a"},
		{"id,share_token", "id%2Cshare_token"},
		// Not valid UTF-8: read as one replacement character first, as a
		// JavaScript string would hold it.
		{"a\xffb", "a%EF%BF%BDb"},
	}
	for _, tt := range tests {
		if got := FormEncode(tt.in); got != tt.want {
			t.Errorf("FormEncode(%q) = %q, want %q", tt.in, got, tt.want)
		}
	}
}

func TestParseQuery(t *testing.T) {
	tests := []struct {
		in   string
		want Query
	}{
		{"q=a+b", Query{{"q", "a b"}}},
		{"q=50%", Query{{"q", "50%"}}},
		{"q=%zz", Query{{"q", "%zz"}}},
		{"q=a;b", Query{{"q", "a;b"}}},
		{"q", Query{{"q", ""}}},
		{"%71=x", Query{{"q", "x"}}},
		{"q=%2B", Query{{"q", "+"}}},
		{"a=1&a=2", Query{{"a", "1"}, {"a", "2"}}},
		{"q=%E6%97%A5", Query{{"q", "日"}}},
		{"q=%FF", Query{{"q", "\uFFFD"}}},
		{"", nil},
		{"&&q=1&&", Query{{"q", "1"}}},
		{"q=a=b", Query{{"q", "a=b"}}},
		{"q=%41%4a%4A", Query{{"q", "AJJ"}}},
		{"=v", Query{{"", "v"}}},
		{"q=%%41", Query{{"q", "%A"}}},
		{"q=%4", Query{{"q", "%4"}}},
	}
	for _, tt := range tests {
		if got := ParseQuery(tt.in); !reflect.DeepEqual(got, tt.want) {
			t.Errorf("ParseQuery(%q) = %q, want %q", tt.in, got, tt.want)
		}
	}
}

func TestQueryGet(t *testing.T) {
	q := ParseQuery("a=1&a=2&b=")
	if v, ok := q.Get("a"); v != "1" || !ok {
		t.Errorf(`Get("a") = %q, %v; want "1", true`, v, ok)
	}
	if v, ok := q.Get("b"); v != "" || !ok {
		t.Errorf(`Get("b") = %q, %v; want "", true`, v, ok)
	}
	if v, ok := q.Get("c"); v != "" || ok {
		t.Errorf(`Get("c") = %q, %v; want "", false`, v, ok)
	}
}

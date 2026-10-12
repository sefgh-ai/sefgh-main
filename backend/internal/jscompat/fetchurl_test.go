package jscompat

import "testing"

func TestFetchURLWirePath(t *testing.T) {
	for _, tc := range []struct{ input, want string }{
		{"https://api.github.com/a|b%2Fc", "/a|b%2Fc"},
		{"https://api.github.com/a^b%2fc", "/a^b%2fc"},
		{"https://api.github.com/{a}/b`c", "/%7Ba%7D/b%60c"},
		{"https://api.github.com/a%zz|^%2F?x='y'#fragment", "/a%zz|^%2F?x=%27y%27"},
		{"https://api.github.com/a/%2e%2e/b?", "/b?"},
	} {
		t.Run(tc.input, func(t *testing.T) {
			u, err := FetchURL(tc.input)
			if err != nil {
				t.Fatal(err)
			}
			if got := u.RequestURI(); got != tc.want {
				t.Fatalf("wire = %q, want %q", got, tc.want)
			}
		})
	}
}

func TestFetchURLRejectsCredentials(t *testing.T) {
	for _, input := range []string{"https://user:pass@api.github.com/a", "https://user@api.github.com/a"} {
		if _, err := FetchURL(input); err == nil {
			t.Errorf("accepted credentials in %q", input)
		}
	}
}

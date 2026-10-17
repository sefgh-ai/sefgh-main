package jscompat

import "testing"

// Each answer was produced by String(JSON.parse(in)) in Node 21.
func TestString(t *testing.T) {
	tests := []struct{ in, want string }{
		{`null`, "null"},
		{`true`, "true"},
		{`false`, "false"},
		{`0`, "0"},
		{`-0`, "0"},
		{`1.5e3`, "1500"},
		{`1e21`, "1e+21"},
		{`1e-7`, "1e-7"},
		{`123456789012345678901234`, "1.2345678901234569e+23"},
		{`0.1`, "0.1"},
		{`-2.50`, "-2.5"},
		{`1e400`, "Infinity"},
		{`-1e400`, "-Infinity"},
		{`1e-400`, "0"},
		{`9007199254740993`, "9007199254740992"},
		{`5e-324`, "5e-324"},
		{`"octo/demo"`, "octo/demo"},
		{`""`, ""},
		{`[]`, ""},
		{`[null]`, ""},
		{`[[]]`, ""},
		{`["octo",null,1.5e3,true]`, "octo,,1500,true"},
		{`[[1,2],[3,[4]]]`, "1,2,3,4"},
		{`["a",[]]`, "a,"},
		{`[{}]`, "[object Object]"},
		{`{}`, "[object Object]"},
		{`{"a":1}`, "[object Object]"},
	}
	for _, tt := range tests {
		value, err := ParseJSON(tt.in)
		if err != nil {
			t.Fatalf("ParseJSON(%s): %v", tt.in, err)
		}
		if got := String(value); got != tt.want {
			t.Errorf("String(%s) = %q, want %q", tt.in, got, tt.want)
		}
	}
}

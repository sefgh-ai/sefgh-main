package jscompat

import (
	"bytes"
	"encoding/json"
	"testing"
)

// Each answer was produced in Node 21 by
// JSON.stringify({ ...JSON.parse(in), b: 9, user_email: undefined, c: null }).
func TestSpreadThenAssign(t *testing.T) {
	tests := []struct{ in, want string }{
		{`{"a":1,"b":2}`, `{"a":1,"b":9,"c":null}`},
		{`{"a":1,"a":3}`, `{"a":3,"b":9,"c":null}`},
		{`["x",null]`, `{"0":"x","1":null,"b":9,"c":null}`},
		{`"ab"`, `{"0":"a","1":"b","b":9,"c":null}`},
		{`"😀"`, `{"0":"\ud83d","1":"\ude00","b":9,"c":null}`},
		{`42`, `{"b":9,"c":null}`},
		{`true`, `{"b":9,"c":null}`},
		{`null`, `{"b":9,"c":null}`},
	}
	for _, tt := range tests {
		fields := Spread(json.RawMessage(tt.in))
		fields = Assign(fields, "b", json.RawMessage(`9`))
		fields = Assign(fields, "user_email", nil)
		fields = Assign(fields, "c", json.RawMessage(`null`))
		var out bytes.Buffer
		WriteObject(&out, fields)
		var got, want any
		if err := json.Unmarshal(out.Bytes(), &got); err != nil {
			t.Fatalf("%s: not JSON: %s", tt.in, out.String())
		}
		_ = json.Unmarshal([]byte(tt.want), &want)
		gotJSON, _ := json.Marshal(got)
		wantJSON, _ := json.Marshal(want)
		if !bytes.Equal(gotJSON, wantJSON) || keyOrder(out.String()) != keyOrder(tt.want) {
			t.Errorf("spread %s\n got  %s\n want %s", tt.in, out.String(), tt.want)
		}
	}
}

// An undefined value removes a field that was there.
func TestAssignUndefinedRemoves(t *testing.T) {
	fields := Assign(Spread(json.RawMessage(`{"a":1,"user_email":"x","b":2}`)), "user_email", nil)
	var out bytes.Buffer
	WriteObject(&out, fields)
	if out.String() != `{"a":1,"b":2}` {
		t.Errorf("got %s", out.String())
	}
}

// keyOrder lists an object's names in the order they are written.
func keyOrder(text string) string {
	fields, _ := ObjectFields([]byte(text))
	names := ""
	for _, f := range fields {
		names += f.Name + ","
	}
	return names
}

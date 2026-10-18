package jscompat

import (
	"encoding/json"
	"errors"
	"io"
	"strings"
)

// DecodeJSON parses an upstream reply as JavaScript's response.json() does.
// The bytes are first decoded as UTF-8 the way a browser decodes them, which
// also drops a leading byte-order mark. Numbers keep the digits that were
// sent, as json.Number. Anything after the first value other than white
// space is an error, as it is for JSON.parse.
func DecodeJSON(body []byte) (any, error) {
	return ParseJSON(DecodeUTF8(body))
}

// ParseJSON parses text as JavaScript's JSON.parse does. Unlike DecodeJSON it
// does not skip a byte-order mark: JSON.parse refuses one.
func ParseJSON(text string) (any, error) {
	decoder := json.NewDecoder(strings.NewReader(text))
	decoder.UseNumber()
	var value, extra any
	if err := decoder.Decode(&value); err != nil {
		return nil, err
	}
	if err := decoder.Decode(&extra); err != io.EOF {
		return nil, errors.New("text after the JSON value")
	}
	return value, nil
}

// JSONParseMessage is a message for JSON.parse failing on text, for
// handlers that send that message to the browser. For text that is empty or
// only white space it is V8's own, "Unexpected end of JSON input" (checked
// in Node 21). For anything else V8's message depends on the text and on
// the V8 version, so this one is fixed.
func JSONParseMessage(text string) string {
	if strings.Trim(text, " \t\n\r") == "" {
		return "Unexpected end of JSON input"
	}
	return "Unexpected token in JSON"
}

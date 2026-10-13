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
	decoder := json.NewDecoder(strings.NewReader(DecodeUTF8(body)))
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

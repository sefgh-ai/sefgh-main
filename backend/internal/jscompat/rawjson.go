package jscompat

import (
	"bytes"
	"encoding/json"
	"io"
)

// Field is one name of a JSON object with its value, exactly as written.
type Field struct {
	Name  string
	Value json.RawMessage
}

// ObjectFields reads a JSON object as JSON.parse would build it, without
// decoding the values: the names in order, each with its value's own text.
// A repeated name keeps its first position and its last value, as it does
// in JavaScript. ok is false when text is not one JSON object, nothing else
// after it, which is when JSON.parse would throw or give something else.
//
// Passing values through as written gives a JSON reader the same values that
// re-encoding them in JavaScript would; only the spelling can differ, such
// as é for é, or digits beyond what a double holds.
func ObjectFields(text []byte) (fields []Field, ok bool) {
	decoder := json.NewDecoder(bytes.NewReader(text))
	decoder.UseNumber()
	if token, err := decoder.Token(); err != nil || token != json.Delim('{') {
		return nil, false
	}
	position := map[string]int{}
	for decoder.More() {
		token, err := decoder.Token()
		if err != nil {
			return nil, false
		}
		name, _ := token.(string)
		var value json.RawMessage
		if err := decoder.Decode(&value); err != nil {
			return nil, false
		}
		if at, seen := position[name]; seen {
			fields[at].Value = value
			continue
		}
		position[name] = len(fields)
		fields = append(fields, Field{name, value})
	}
	if token, err := decoder.Token(); err != nil || token != json.Delim('}') {
		return nil, false
	}
	if _, err := decoder.Token(); err != io.EOF {
		return nil, false
	}
	return fields, true
}

// Elements reads a JSON array's elements in order, each as written. ok is
// false when text is not one JSON array, nothing else after it.
func Elements(text []byte) (elements []json.RawMessage, ok bool) {
	decoder := json.NewDecoder(bytes.NewReader(text))
	decoder.UseNumber()
	if token, err := decoder.Token(); err != nil || token != json.Delim('[') {
		return nil, false
	}
	for decoder.More() {
		var value json.RawMessage
		if err := decoder.Decode(&value); err != nil {
			return nil, false
		}
		elements = append(elements, value)
	}
	if token, err := decoder.Token(); err != nil || token != json.Delim(']') {
		return nil, false
	}
	if _, err := decoder.Token(); err != io.EOF {
		return nil, false
	}
	return elements, true
}

// Kind says which JSON type a value written as raw is: '{', '[', '"', 'n'
// for null, 't' or 'f' for true or false, and '0' for a number.
func Kind(raw json.RawMessage) byte {
	trimmed := bytes.TrimLeft(raw, " \t\r\n")
	if len(trimmed) == 0 {
		return 0
	}
	switch c := trimmed[0]; c {
	case '{', '[', '"', 'n', 't', 'f':
		return c
	}
	return '0'
}

// WriteObject writes fields as one JSON object, values as they are.
func WriteObject(buffer *bytes.Buffer, fields []Field) {
	buffer.WriteByte('{')
	for i, field := range fields {
		if i > 0 {
			buffer.WriteByte(',')
		}
		name, _ := json.Marshal(field.Name)
		buffer.Write(name)
		buffer.WriteByte(':')
		buffer.Write(field.Value)
	}
	buffer.WriteByte('}')
}

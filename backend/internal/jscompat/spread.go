package jscompat

import (
	"encoding/json"
	"strconv"
)

// Spread is the list of fields `{...value}` copies, for one value given as
// its raw JSON text:
//
//   - an object's own fields, in order, with the last value of a repeated
//     name in its first place, as JSON.parse keeps them;
//   - a list's items, named "0", "1", ...;
//   - text's UTF-16 units, named the same way;
//   - nothing for null, a number or a boolean.
func Spread(raw json.RawMessage) []Field {
	switch Kind(raw) {
	case '{':
		fields, _ := ObjectFields(raw)
		return fields
	case '[':
		elements, _ := Elements(raw)
		fields := make([]Field, len(elements))
		for i, element := range elements {
			fields[i] = Field{Name: strconv.Itoa(i), Value: element}
		}
		return fields
	case '"':
		var text string
		_ = json.Unmarshal(raw, &text)
		units := ToUTF16(text)
		fields := make([]Field, len(units))
		for i, unit := range units {
			value, _ := UTF16{unit}.MarshalJSON()
			fields[i] = Field{Name: strconv.Itoa(i), Value: value}
		}
		return fields
	}
	return nil
}

// Assign is one property of an object literal written after a spread, as
// in `{...row, name: value}`: a field already there keeps its place and
// takes the new value, and a new one goes last. A nil value is undefined,
// which JSON.stringify leaves out, so the field is removed.
func Assign(fields []Field, name string, value json.RawMessage) []Field {
	for i, field := range fields {
		if field.Name == name {
			if value == nil {
				return append(fields[:i:i], fields[i+1:]...)
			}
			fields[i].Value = value
			return fields
		}
	}
	if value == nil {
		return fields
	}
	return append(fields, Field{Name: name, Value: value})
}

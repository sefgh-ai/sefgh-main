//go:build !solution

package lesson23

// pick returns the fields whose names are in names, in the order of names.
// A name with no field is left out, as JSON.stringify leaves out undefined.
//
// TODO:
//  1. Make a map[string]Field from fields, keyed by Name.
//  2. Loop over names. When the map has the name, append that field.
//  3. Return what you appended.
func pick(fields []Field, names []string) []Field {
	return nil
}

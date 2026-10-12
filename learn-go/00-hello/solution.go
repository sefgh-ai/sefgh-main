//go:build solution

package main

func greeting(name string) string {
	if name == "" {
		name = "stranger"
	}
	return "Hello, " + name + "!"
}

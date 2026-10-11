# Lesson 00: Hello

**You will learn:** how to run, test and format a Go program, and how every lesson in this folder works.

## Run a program

From the `learn-go` folder:

```
go run ./00-hello
```

It prints an empty line. Fixing that is your first exercise.

## Read the program

Open `main.go`:

```go
package main

import "fmt"

func main() {
	fmt.Println(greeting("SEFGH"))
}
```

Four things differ from JavaScript.

1. **Every file starts with `package`.** All the files in one folder form one package. A program starts in the package named `main`, at the function named `main`.
2. **`import "fmt"` brings in another package.** `fmt` is part of Go's standard library, and `fmt.Println` is Go's `console.log`.
3. **A capital letter means "public".** You write `fmt.Println`, never `fmt.println`. Go has no `export` keyword: a name that starts with a capital letter can be used from other packages, and a lower-case name cannot.
4. **Go is compiled.** `go run` first turns your code into a program, then runs it. If anything is wrong, such as a misspelled name, a wrong type, or an import you do not use, you get an error before the program starts.

## Read a function

Open `exercise.go`:

```go
func greeting(name string) string {
```

Read it as: "a function called `greeting` that takes a string called `name` and gives back a string."

In JavaScript this would be `function greeting(name) {`. Go makes you say what type goes in and what type comes out, and the type is written **after** the name. In return, Go checks every call for you before the program ever runs.

## Your turn

Make `greeting` return `"Hello, <name>!"`. When the name is empty, return `"Hello, stranger!"`.

You need two things:

- `+` joins strings, the same as in JavaScript.
- An `if` has no parentheses around the condition, and the braces are required:

```go
if name == "" {
	// ...
}
```

Check your work:

```
go test ./00-hello
```

`FAIL` shows what the function returned and what the test wanted. `ok` means you are done. Then run the program again and see your greeting.

## Format your code

```
gofmt -w .
```

Go has one official style, and this tool applies it: tabs for indentation, spacing, alignment. Nobody argues about formatting in Go, because nobody chooses it. The VS Code Go extension runs this each time you save.

## Stuck?

```
go test -tags solution ./00-hello
```

That runs the same tests against `solution.go`. Open it and compare with yours.

## You now know

- `go run`, `go test` and `gofmt`
- Packages, imports, and the capital-letter rule
- How to read a function's signature

Next: [Lesson 01, values and functions](../01-values-and-functions/README.md).

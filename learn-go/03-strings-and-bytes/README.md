# Lesson 03: Strings and bytes

**You will learn:** what a Go string really is, how to loop over one, and how to build a new one.

**Real code:** `EncodeURIComponent` in `backend/internal/jscompat/jscompat.go`.

## The problem in the app

To search GitHub, the handler puts the user's query inside a URL. A URL cannot contain a raw space, `#` or `&`, so those are replaced by a percent sign and two hex digits: a space becomes `%20`, and `#` becomes `%23`.

JavaScript has a built-in function for this, and the Next.js handler uses it:

```js
encodeURIComponent("C# tips")   // "C%23%20tips"
```

Go has functions that look similar, but they make different choices. `url.QueryEscape` turns a space into `+`, and it escapes `!`, `'`, `(`, `)` and `*`, which JavaScript leaves alone. The contract compares the URL sent to GitHub **byte for byte**, so "nearly the same" fails. The backend therefore has its own version, written to match JavaScript exactly. In this lesson you write it too.

## A string is a row of bytes

In Go a string is a read-only sequence of **bytes**. A byte is a number from 0 to 255.

```go
s := "react"
len(s)   // 5
s[0]     // 114, the byte for 'r'
```

`'r'` in single quotes is not a string. It is the number 114 written in a readable way. That means you can compare characters as numbers:

```go
if 'a' <= c && c <= 'z' {
	// c is a lower-case letter
}
```

## One character can be several bytes

Go stores text as UTF-8. Plain English letters take one byte each. Most other characters take more:

```go
len("é")    // 2
len("日本")  // 6
```

So `len` counts bytes, not characters. JavaScript has its own version of this surprise, with different numbers: `"日本".length` is 2, but `"😀".length` is also 2.

Go gives you two ways to loop, and they see the string differently:

```go
for i := 0; i < len(s); i++ {
	c := s[i]        // one BYTE at a time
}

for _, r := range s {
	// one CHARACTER at a time
}
```

Percent-encoding works on bytes. `é` is the two bytes `C3 A9`, so it becomes `%C3%A9`. That is why the real function uses the first kind of loop.

## Building a string

Strings cannot be changed after they are made. Adding to one with `+` inside a loop makes a brand-new string every time round. For building text piece by piece, Go has `strings.Builder`:

```go
var b strings.Builder
b.WriteByte('%')
b.WriteString("20")
result := b.String()   // "%20"
```

To use it, add `import "strings"` under the `package` line. With the VS Code Go extension, saving the file adds the import for you.

## From a byte to two hex digits

A byte is two hex digits: the first is the byte divided by 16, the second is the remainder. This string turns a number from 0 to 15 into its digit:

```go
const hex = "0123456789ABCDEF"
hex[c/16]   // first digit
hex[c%16]   // second digit
```

The real code writes `c>>4` and `c&0x0F`. Those are the same two calculations, done with bit operations.

## When the bytes are not text at all

A Go string can hold any bytes, including ones that are not valid UTF-8. That happens in this app: a README on GitHub is not always saved as UTF-8. Some are UTF-16, and some use an older encoding for Chinese or Western European text.

Both languages show such a byte as the replacement character, `�`. They disagree about how many to show:

| Bytes | JavaScript | `strings.ToValidUTF8` |
|---|---|---|
| `FF FE` (the start of a UTF-16 file) | 2 | 1 |
| `C4 E3 BA C3` (two Chinese characters in GBK) | 3 | 1 |

Go's helper writes one `�` for a whole run of bad bytes. JavaScript writes one for each broken sequence. Neither is wrong, but the two backends have to return the same string, so the Go backend has its own decoder that follows JavaScript's rule: `DecodeUTF8` in `backend/internal/jscompat/utf8.go`.

It reads the bytes one at a time, remembering how many more bytes the current character still needs. That is the same loop-over-bytes shape as your `percentEncode` below, with a little state carried from one byte to the next. It was checked against JavaScript's own decoder on 200,000 random byte strings.

## Your turn

Open `exercise.go` and finish:

1. `isUnreserved`: may this byte stay as it is?
2. `percentEncode`: the encoder itself
3. `countCharacters`: characters, not bytes

```
go test ./03-strings-and-bytes
```

The expected values in the test came from running JavaScript's `encodeURIComponent`, so when your tests pass, your Go agrees with JavaScript.

## After you pass

Compare yours with `EncodeURIComponent` in `backend/internal/jscompat/jscompat.go`. Then look at the case named `query-characters-left-unescaped` in `contracts/github-search/cases.json`. It is the test that would fail if someone swapped in Go's `url.QueryEscape`.

## You now know

- Strings are bytes, and `len` counts bytes
- The two kinds of `for` loop over a string
- `strings.Builder`
- Why a port must sometimes copy another language's exact behaviour

Next: [Lesson 04, errors](../04-errors/README.md).

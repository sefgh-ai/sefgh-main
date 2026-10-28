# Lesson 29: A JavaScript pattern in Go

**You will learn:** why a regular expression copied from JavaScript can match different text in Go, and the three changes that make the videos route's pattern match what JavaScript matches. You will also see why Go's match positions are byte offsets, and how to turn them into the positions JavaScript gives.

**Real code:** `youtubeID` and `kind` in `backend/internal/videos/handler.go`, and `JSSpace`, `JSDot` and `FindSubmatchUTF16` in `backend/internal/jscompat/regexp.go`.

## The problem in the app

When you add a video to a repository, the Next.js handler looks for a YouTube id in the address, to build a thumbnail:

```js
const match = videoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)
videoId = match ? match[1] : null
```

Lesson 14 showed Go's `regexp` package. Most of this pattern means the same thing in Go. Three parts do not, and each one changes which id is found.

## 1. Go's `\s` is smaller

In JavaScript, `\s` matches every kind of white space: the vertical tab, the no-break space (U+00A0), the line separator (U+2028) and more. In Go, `\s` is only the five ASCII ones: tab, newline, form feed, carriage return and space.

So `[^"&?\/\s]` in Go would let a no-break space into the id, where JavaScript stops. `jscompat.JSSpace` lists JavaScript's set, ready to put inside a class:

```go
JSSpace = `\t\n\x0B\f\r \x{a0}\x{1680}\x{2000}-\x{200a}\x{2028}\x{2029}\x{202f}\x{205f}\x{3000}\x{feff}`
```

## 2. Go's `.` is bigger

In JavaScript, `.` matches any character except four line breaks: `\n`, `\r`, U+2028 and U+2029. In Go, `.` stops only at `\n`. `jscompat.JSDot` is JavaScript's `.` written as a Go class:

```go
JSDot = `[^\n\r\x{2028}\x{2029}]`
```

The Go pattern is the JavaScript one with these two pieces joined in:

```go
var youtubeID = regexp.MustCompile(`(?:youtube\.com/(?:[^/]+/` + jscompat.JSDot + `+/|(?:v|e(?:mbed)?)/|` + jscompat.JSDot + `*[?&]v=)|youtu\.be/)([^"&?/` + jscompat.JSSpace + `]{11})`)
```

The slashes lose their backslashes: in JavaScript a `/` ends the pattern, so it must be escaped, but a Go pattern is an ordinary string.

## 3. `{11}` counts different things

Lesson 20 showed that JavaScript strings are UTF-16 units, and that an emoji takes two of them. A JavaScript pattern without the `u` flag works on those units, so `{11}` means eleven units. Go's `regexp` works on whole characters (runes), so `{11}` means eleven characters.

| Address | JavaScript's id | Go's `regexp` alone |
|---|---|---|
| `https://youtu.be/abcdefghi😀x` | `abcdefghi😀` (9 + 2 units) | `abcdefghi😀x` |
| `https://youtu.be/abcdefghij😀` | `abcdefghij` and **half** of the emoji | `abcdefghij😀` |

The second row is strange, but it is what the site does today, and the port copies it.

## The trick: one character per unit

`FindSubmatchUTF16` makes Go count units. It turns the text into UTF-16 units, then builds a new Go string with **one rune for each unit**. A unit that is half of an emoji becomes a rune of its own, above U+FFFF, where nothing else in the new string can be. In that string, `{11}` counts what JavaScript counts.

Go's `regexp` answers with **byte offsets**: `FindStringSubmatchIndex` says where the match starts and ends in bytes, not in characters. The helper counts the runes before each offset to turn it into a unit position, and cuts the id from the units:

```go
start := utf8.RuneCountInString(text[:loc[2*n]])
end := utf8.RuneCountInString(text[:loc[2*n+1]])
return units[start:end], true
```

A Go string cannot hold half an emoji (Go would put U+FFFD, "�", in its place). So the id stays a `jscompat.UTF16`, and its `MarshalJSON` (lesson 20) writes the lone half as an escape, as JavaScript's `JSON.stringify` does.

## A list has `includes` too (until version 2)

`videoUrl` comes from the request body, so it may be a list. In JavaScript, `["youtube.com"].includes("youtube.com")` is true: a list's `includes` looks for an equal item. The port first copied that with a type switch (lesson 25), so a list, or `https://other.test/clip.mp4?github.com`, was stored as a video. That was a recorded defect (R-088).

## Version 2: read the address instead of searching it

On 2026-10-28 you chose: only an `https` address whose host is exactly YouTube's or GitHub's. `kind` now parses the text and looks the host up:

```go
var videoHosts = map[string]string{
	"youtube.com": "youtube", "youtu.be": "youtube", "github.com": "github", // and three more
}

text, isText := videoURL.(string)
if !isText {
	return "", nil, false
}
address, err := url.Parse(text)
if err != nil || address.Scheme != "https" || address.User != nil || address.Port() != "" {
	return "", nil, false
}
videoType, ok = videoHosts[address.Host]
```

Three Go ideas are in there:

- `videoURL.(string)` with two results is a type assertion that cannot panic: `isText` is false for a list, a number or an object. In JavaScript you would write `typeof videoURL === "string"`.
- `videoHosts[address.Host]` with two results is the "comma ok" form. A missing key gives the zero value, `""`, and `ok` false, like `map.get(key)` giving `undefined` in JavaScript, but you are told which one happened.
- `url.Parse` is not `new URL()`. JavaScript lower-cases the host (`new URL("https://GitHub.com").host` is `github.com`); Go keeps it as written. So `https://GitHub.com/...` is refused here, and that is on purpose: the page's YouTube player only recognises the lower-case spelling. Go also refuses an address holding a control character such as the vertical tab. JavaScript's `URL` removes tabs and line breaks without a word and percent-encodes other control characters in the path.

The host alone gives the type now, so `https://github.com/octo/youtube.com/...` is a GitHub video. The contract moved to version 2: six recorded cases are refused with 400, and ten new ones pin the rule (`post-http`, `post-lookalike-host`, `post-user-name`, `post-port`, `post-host-case` and more). The Next.js handler still accepts any text until it is retired, so where it differs each case keeps its recorded answer as `next_expect`.

## How the port was checked

The videos contract (`contracts/repo-videos`) was recorded from the real Next.js handler, with addresses for each trap: a no-break space, a vertical tab, a line separator, an emoji inside the id and one cut in half. Then each fix was undone on purpose, one at a time. Go's own `\s`, Go's own `.`, matching over runes, and writing the id through a Go string: every one made a contract case fail.

## Your turn

Go's `regexp` gives positions in bytes. JavaScript's `match.index` gives them in UTF-16 units. Open `exercise.go` and write `unitIndex`, which turns one into the other.

```text
go test ./29-a-javascript-pattern-in-go
go test -tags solution ./29-a-javascript-pattern-in-go
```

## You now know

- A pattern copied from JavaScript needs checking in Go: `\s` and `.` match different characters.
- A JavaScript pattern without the `u` flag counts UTF-16 units; Go's counts runes.
- Go's `regexp` answers in byte offsets; count runes or units to get other positions.
- Half of an emoji fits in UTF-16 units, but not in a Go string.
- `includes` means different things on text and on a list.
- Parse an address and compare its parts; never search the text. `url.Parse` keeps the host's case, unlike JavaScript's `URL`.
- `v, ok := m[k]` tells a missing key from a stored zero value.

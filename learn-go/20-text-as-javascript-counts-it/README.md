# Lesson 20: Text as JavaScript counts it

**You will learn:** the three different lengths of one piece of text, how to cut text where JavaScript cuts it, and how a type can decide for itself how it is written as JSON.

**Real code:** `fallbackTitle` in `backend/internal/aichat/title.go`, and `UTF16` in `backend/internal/jscompat/utf16.go`.

## The problem in the app

When a new chat starts, the browser asks for a title. If the AI cannot give one, the server makes one itself: the first four words of the message, cut to 30 characters, with `...` when longer. That is `generateConversationTitle` in `src/lib/ai/github.js`:

```js
const words = firstMessage.split(' ').slice(0, 4).join(' ')
return words.length > 30 ? words.substring(0, 30) + '...' : words
```

The Go port must give exactly the same title. The hard part is the word "characters".

## Three lengths of one string

Take the text `a😀`. Ask three questions and you get three answers:

| Question | Go | Answer | Why |
|---|---|---|---|
| How many bytes? | `len(s)` | 5 | Go strings are UTF-8 bytes. `a` is 1 byte, the emoji 4 |
| How many characters? | `len([]rune(s))` | 2 | A `rune` is one Unicode code point |
| What does JavaScript say? | `s.length` in JS | 3 | JavaScript counts UTF-16 units. An emoji is two of them |

Lesson 03 covered the first two. The third is JavaScript's own. Characters outside Unicode's "basic plane", which includes every emoji, are stored as a **pair** of UTF-16 units: a high half and a low half. JavaScript's `length` counts units, not characters.

The chat contract counts as JavaScript does, so the Go code does too. `jscompat.UTF16Len` from lesson 19's route counts two for every rune at or above `0x10000`.

## Cutting where JavaScript cuts

`substring(0, 30)` keeps the first 30 **units**. If unit 30 is the high half of an emoji, JavaScript keeps that half and drops the other. The title then ends in half an emoji, and `JSON.stringify` writes it as the escape `\ud83d`.

Go cannot do that with a string. A Go string holding half a pair is not valid UTF-8, and Go's JSON encoder writes the replacement character `�` instead, which is a different string. A `[]rune` cannot hold half a pair either: a rune is a whole character.

So the real code converts to UTF-16 units first, with the standard package `unicode/utf16`, and cuts there:

```go
type UTF16 []uint16

func ToUTF16(s string) UTF16 {
	return utf16.Encode([]rune(s))
}
```

```go
title := jscompat.ToUTF16(strings.Join(words, " "))
if len(title) > 30 {
	title = append(title[:30:30], '.', '.', '.')
}
```

`title[:30:30]` has a third number. The second says where the slice ends, the third how much room it has. With no spare room, `append` must copy into new memory instead of writing the dots over units 30 to 32 of the old one. Here nothing else holds the old slice, so it would not matter. Whenever something else does, it matters a lot, and the habit costs nothing.

## Deciding how you are written as JSON

`UTF16` is a list of numbers. Go's encoder would write it as `[73,32,108,...]`. It needs to be written as a string, and half a pair as `\ud83d`. So it has a method:

```go
func (u UTF16) MarshalJSON() ([]byte, error)
```

That is the whole trick. `encoding/json` checks every value it writes for a method with exactly this name and shape, and if there is one, uses it. No registration and no `implements` keyword: having the method is enough. The type is said to satisfy the interface `json.Marshaler`. Lesson 06 met the same idea with `ServeHTTP` and `http.Handler`.

JavaScript has a cousin of this: an object with a `toJSON()` method is written by `JSON.stringify` however `toJSON` says.

Inside `MarshalJSON`, a pair is written as the character it stands for, and a half on its own is written as an escape:

```go
case isHighHalf(unit) || isLowHalf(unit):
	out = fmt.Appendf(out, `\u%04x`, unit)
```

`%04x` writes the number in lowercase hexadecimal, padded to four digits, which is what JavaScript writes. The test beside it compares each answer with what `JSON.stringify` wrote in Node.

## Two smaller ideas in the same route

**A method as a value.** The chat handler is told how to check sign-in like this, in `backend/cmd/api/main.go`:

```go
SignIn: verifier.SignedInUser,
```

No brackets: this does not call the method, it hands it over. In JavaScript, `const f = verifier.signedInUser` loses `this`, and calling `f()` breaks. In Go, `verifier.SignedInUser` remembers its `verifier`. The handler calls `h.SignIn(r)` and never needs to know about Supabase. A test hands it a different function in one line.

**A value that means "missing".** JavaScript has `undefined` and `null`. A reply with no `content` field gives `undefined`, which `JSON.stringify` leaves out entirely, so chat answers `{}`. A `content` of `null` answers `{"response":null}`. Go's `nil` is one value and cannot tell the two apart. So `backend/internal/aiprovider/provider.go` makes a value of its own:

```go
var Undefined any = undefined{}

type undefined struct{}
```

`undefined` starts with a small letter, so no other package can make one. The only value of that type anyone can have is `Undefined` itself, and the handler compares with `content == aiprovider.Undefined`.

## Your turn

Open `exercise.go` and write `fallbackTitle`. It returns UTF-16 units, so it can hold half an emoji just like the real one:

1. Split the message at every single space with `strings.Split`, keep at most the first four pieces, and join them again with single spaces.
2. Convert the result to UTF-16 units: `utf16.Encode([]rune(text))`.
3. If there are more than 30 units, keep the first 30 and add three `'.'` units.

```text
go test ./20-text-as-javascript-counts-it
go test -tags solution ./20-text-as-javascript-counts-it
```

Repeated spaces are not a mistake in the tests: `split(' ')` makes empty words out of them, and the real title does the same. That is recorded as a defect in the chat contract, and the port copies it on purpose.

## You now know

- One string has three lengths: bytes, runes, and JavaScript's UTF-16 units.
- An emoji is one rune and two UTF-16 units, and `unicode/utf16` converts between them.
- Cutting by units can split a character. Only a list of units can hold the half.
- `slice[:n:n]` makes `append` copy instead of writing into memory someone else may hold.
- A type with a `MarshalJSON` method decides how it is written as JSON.
- `value.Method` without brackets is a function that remembers `value`.
- A private type with one exported value makes a marker nothing else can equal.


## BUG-060: R-010

The React chat hook guards assistant replies for send, edit and regeneration. Non-text or blank responses show The assistant sent an empty answer and are never stored as assistant text; the conversation/user message stays, and regeneration preserves the prior answer. API non-text replies remain characterized unchanged.

See the real backend and its regression fixtures. Existing exercise.go files are untouched; lesson checks are optional.


## BUG-061: R-012

Fallback chat titles cap the first four words at30 Unicode code points and append dots only when longer. Emoji scalar values remain intact; existing UTF-16 helper behavior elsewhere and rollback Next titles remain pinned.

See the real backend and its regression fixtures. Existing exercise.go files are untouched; lesson checks are optional.

BUG-061 changes the current fallbackTitle to []rune, a slice of Unicode code points. len(string) counts bytes; len([]rune(string)) counts code points; JavaScript length counts UTF-16 units. Only the latter can cut between an emoji�s surrogate halves. The existing exercises still teach the original UTF-16 port; do not rewrite them. This cap preserves code points, not every multi-code-point grapheme cluster.


## BUG-062: R-013

Fallback titles collapse ECMAScript whitespace before selecting four words. A title emptied by quote stripping uses that fallback. The first message is JSON-escaped inside the title prompt, including quotes, backslashes and controls. The30-code-point cap remains.

See the real backend and its regression fixtures. Existing exercise.go files are untouched; lesson checks are optional.

Words uses strings.FieldsFunc with the existing JavaScript whitespace predicate: repeated spaces, tabs and line breaks do not create empty words; ECMAScript includes BOM and excludes U+0085. TitleMessages reuses UTF16.MarshalJSON to escape string contents before placing them between the prompt�s quotes. Its first/last bytes are always the JSON quotation marks, so the interior slice is safe even for an empty string. This preserves the prompt structure; it does not make claims about model compliance.

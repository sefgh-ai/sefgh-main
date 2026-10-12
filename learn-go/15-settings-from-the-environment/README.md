# Lesson 15: Settings from the environment

**You will learn:** reading environment variables, handing one function to another, and why a program should refuse to start with a bad setting.

**Real code:** `listenAddr` in `backend/cmd/api/main.go`, and `TestListenAddr` in `main_test.go` beside it.

## The problem in the app

On your machine the Go server listens at `127.0.0.1:8787`. That is two things joined by a colon: an address and a port.

| Written as | Who can connect |
|---|---|
| `127.0.0.1:8787` | Only programs on this computer |
| `:3000` | Anything that can reach this computer, on port 3000 |

The first is right for development. It is wrong on a hosting platform. A platform runs many programs on one machine, so it picks a free port for each and tells the program which one through an environment variable named `PORT`. The program also has to accept connections from outside, which is what leaving out the address before the colon means.

So the server now decides in this order:

1. `SEFGH_API_ADDR` is set: use exactly that.
2. `PORT` is set: listen on that port, for everyone.
3. Neither: `127.0.0.1:8787`, this computer only.

## Reading a variable

```go
port := os.Getenv("PORT")
```

In JavaScript, `process.env.PORT` is `undefined` when the variable is not set. Go has no `undefined`. `os.Getenv` gives the empty string `""`, both when the variable is missing and when it is set to nothing.

When that difference matters there is `os.LookupEnv`, which returns the value and a boolean: the "comma ok" shape from lesson 02. Here an empty `PORT` and a missing one should mean the same thing, so `Getenv` is enough.

One more difference from Next.js: Go does not read `.env.local`. A variable exists only if the shell or the platform that started the program set it.

## Handing a function to a function

```go
func listenAddr(getenv func(string) string) (string, error) {
```

Look at the parameter. Its name is `getenv` and its type is `func(string) string`: "a function that takes a string and returns a string". You pass functions around in JavaScript all the time, as in `items.map(format)`. Go does the same, with the type written out.

The server calls it like this:

```go
addr, err := listenAddr(os.Getenv)
```

There are no brackets after `os.Getenv`. That hands over the function itself. With brackets you would be handing over its answer.

Why not call `os.Getenv` directly inside `listenAddr`? Because of the test. The environment belongs to the whole program, so a test that changed `PORT` could disturb every other test. Instead, the test supplies its own function:

```go
got, err := listenAddr(func(name string) string { return tt.env[name] })
```

`tt.env` is a map. Asking a map for a key it does not have gives the zero value, which for a string is `""`. That happens to be exactly what `os.Getenv` gives for a variable that is not set, so a map makes a good pretend environment.

Lesson 13 did the same thing with the clock. The rule is general: when code depends on something outside the program, pass that thing in.

## Refuse a bad setting at the start

```go
n, err := strconv.Atoi(port)
if err != nil || n < 1 || n > 65535 {
	return "", fmt.Errorf("PORT must be a number from 1 to 65535, got %q", port)
}
return ":" + strconv.Itoa(n), nil
```

`strconv.Atoi` turns text into a number, as in lesson 04. Ports run from 1 to 65535.

The interesting choice is what to do when `PORT` is wrong. The gentle option is to fall back to 8787. It is also the worst option: the platform would wait for a server on its port, the server would be listening somewhere else, and you would be staring at a deployment that hangs with no message. Stopping at once with a clear sentence turns that into a ten-second fix. `regexp.MustCompile` in lesson 14 made the same choice.

Two small details:

- `%q` prints the value inside quotes, so a stray space is visible: `got " 3000"`.
- The address is built from the number, not from the original text, so `08080` becomes `:8080`.

`run` returns that error to `main`, which logs it and exits with status 1. A platform reads a status other than 0 as "this failed to start".

## Your turn

Open `exercise.go`.

1. `fromMap`: turn a map into a function shaped like `os.Getenv`. This is the pretend environment from the test above, as a function that returns a function.
2. `timeoutFrom`: read a setting named `TIMEOUT_SECONDS`. Missing means 10 seconds, a whole number from 1 to 60 means that many seconds, and anything else is an error that names the setting. `TIMEOUT_SECONDS` is made up for practice. The real server has no such setting.

```text
go test ./15-settings-from-the-environment
go test -tags solution ./15-settings-from-the-environment
```

## You now know

- `os.Getenv` gives `""` for a variable that is not set. Go does not read `.env.local`.
- `127.0.0.1:8787` is this computer only. `:3000` is everyone.
- A function can be a parameter. Its type spells out what it takes and returns.
- Pass the outside world in, and a test can replace it with a map.
- A wrong setting should stop the program at start-up, with a message that names it.

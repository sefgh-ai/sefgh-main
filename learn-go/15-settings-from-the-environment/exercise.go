//go:build !solution

package lesson15

import "time"

// fromMap turns a map into a function with the same shape as os.Getenv, so
// a test can supply settings without touching the real environment.
func fromMap(values map[string]string) func(string) string {
	// TODO: the function below ignores values. Make it look name up in them.
	return func(name string) string {
		return ""
	}
}

// timeoutFrom reads the setting TIMEOUT_SECONDS through getenv.
//
//   - Not set, or set to "": defaultTimeout and no error.
//   - A whole number from 1 to 60: that many seconds.
//   - Anything else: 0 and an error whose text contains "TIMEOUT_SECONDS".
//
// TIMEOUT_SECONDS is made up for this exercise. The real server has no such
// setting.
func timeoutFrom(getenv func(string) string) (time.Duration, error) {
	// TODO: follow listenAddr in backend/cmd/api/main.go. strconv.Atoi turns
	// text into a number, and time.Duration(n) * time.Second turns a number
	// into that many seconds. You will need to import "fmt" and "strconv".
	return 0, nil
}

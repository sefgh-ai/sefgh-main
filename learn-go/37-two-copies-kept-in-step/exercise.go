//go:build !solution

package lesson37

// sources gives the sources of one directive in a content security policy,
// or nil when the policy does not have that directive. With the policy
// "script-src 'self' https:; connect-src 'self' wss://x", sources(policy,
// "connect-src") is ["'self'", "wss://x"].
//
// TODO:
//  1. Split the policy into directives at ";" (strings.Split).
//  2. Split each directive into words with strings.Fields, which also drops
//     the spaces around it. Skip a directive with no words.
//  3. When the first word is the name you want, return the rest of the
//     words. If the name never comes up, return nil.
func sources(policy, name string) []string {
	return nil
}

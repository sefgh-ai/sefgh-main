package githubaccess

import "net/http"

// SignedInUser says which Supabase user a request's bearer token belongs to,
// as src/lib/supabase/verify-bearer.js does. It is the Supabase half of
// Resolve, for routes that need a signed-in user and no GitHub credential.
//
// It answers the user's id with 200; 401 for no bearer, a malformed one, a
// session Supabase refuses, an anonymous account, or a reply whose id is not
// text; and 503 when Supabase could not be asked or did not answer as
// expected. Resolve answers 403 for some of those, because there the session
// is accepted and the GitHub account is what fails. Here 401 is the answer
// the chat contract pins.
func (v Verifier) SignedInUser(r *http.Request) (string, int) {
	id, anonymous, _, status := v.account(r)
	if status != 200 {
		return "", status
	}
	if anonymous {
		return "", 401
	}
	return id, 200
}

// User is SignedInUser for routes that read the caller's own rows from the
// database. An anonymous account counts as a user here, as it does for
// supabase.auth.getUser(), which those Next.js handlers call. User also
// hands back the bearer itself, so the database can be asked as this user:
// row-level security then applies exactly as it does to the Next.js
// handler's own client.
func (v Verifier) User(r *http.Request) (id, session string, status int) {
	id, _, session, status = v.account(r)
	if status != 200 {
		return "", "", status
	}
	return id, session, 200
}

// account asks Supabase who the bearer belongs to.
func (v Verifier) account(r *http.Request) (id string, anonymous bool, session string, status int) {
	session, ok := sessionToken(r)
	if !ok {
		return "", false, "", 401
	}
	if v.SupabaseURL == "" || v.SupabaseKey == "" {
		return "", false, "", 503
	}
	ctx, cancel := v.deadline(r)
	defer cancel()
	reply, status := v.askSupabase(ctx, session)
	if status != 200 {
		return "", false, "", status
	}
	// typeof id !== 'string' || id === '', in Go. A reply that is not an
	// object has no id, so it is refused here too.
	user, _ := reply.(map[string]any)
	id, isText := user["id"].(string)
	if !isText || id == "" {
		return "", false, "", 401
	}
	return id, truthy(user["is_anonymous"]), session, 200
}

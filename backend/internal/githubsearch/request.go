package githubsearch

import (
	"errors"
	"regexp"
	"strconv"
	"strings"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/jscompat"
)

const (
	// GitHub serves only the first 1000 results, so no later page can succeed.
	maxPage    = 1000
	maxPerPage = 100
)

// The same patterns as the Next.js handler, character for character.
var (
	languagePattern = regexp.MustCompile(`^[A-Za-z0-9._+#-]+( [A-Za-z0-9._+#-]+)*$`)
	starsPattern    = regexp.MustCompile(`^(\*|[0-9]+|[0-9]+\.\.[0-9]+|[<>]=?[0-9]+)$`)
	integerPattern  = regexp.MustCompile(`^-?[0-9]+$`)
)

// Errors returned by parseRequest. Their text is sent to the caller.
var (
	errMissingQuery      = errors.New("Search query is required")
	errInvalidParameters = errors.New("Invalid search parameters")
)

// sortOption is what one of our filter names means to GitHub.
type sortOption struct {
	sort  string
	order string
}

// sortOptions maps the API's filter names to GitHub's sort and order.
// A Go map has no inherited keys, so a name like "constructor" is simply
// absent and falls back to "all".
var sortOptions = map[string]sortOption{
	"all":      {sort: "", order: "desc"},
	"latest":   {sort: "updated", order: "desc"},
	"monthly":  {sort: "updated", order: "desc"},
	"yearly":   {sort: "updated", order: "desc"},
	"featured": {sort: "stars", order: "desc"},
}

// searchRequest is a validated search, ready to send to GitHub.
type searchRequest struct {
	query   string // q with the language and stars qualifiers appended
	sort    sortOption
	page    int64
	perPage int64
}

// parseRequest validates the raw query string of an incoming request.
func parseRequest(rawQuery string) (searchRequest, error) {
	params := jscompat.ParseQuery(rawQuery)
	query, _ := params.Get("q")
	sortName := valueOr(params, "sort", "all")
	language, _ := params.Get("language")
	stars, _ := params.Get("stars")
	page := valueOr(params, "page", "1")
	perPage := valueOr(params, "per_page", "30")

	// strings.TrimSpace removes exactly the Unicode White_Space characters,
	// the same set as \p{White_Space} in the JavaScript handler.
	if strings.TrimSpace(query) == "" {
		return searchRequest{}, errMissingQuery
	}

	validLanguage := language == "" ||
		(len(language) <= 50 && languagePattern.MatchString(language))
	validStars := stars == "" || starsPattern.MatchString(stars)
	if !validLanguage || !validStars ||
		!integerPattern.MatchString(page) || !integerPattern.MatchString(perPage) {
		return searchRequest{}, errInvalidParameters
	}

	if language != "" {
		// GitHub needs quotes around a qualifier value that contains a space.
		if strings.Contains(language, " ") {
			query += ` language:"` + language + `"`
		} else {
			query += " language:" + language
		}
	}
	if stars != "" {
		query += " stars:" + stars
	}

	option, ok := sortOptions[sortName]
	if !ok {
		option = sortOptions["all"]
	}

	return searchRequest{
		query:   query,
		sort:    option,
		page:    clamp(page, 1, maxPage),
		perPage: clamp(perPage, 1, maxPerPage),
	}, nil
}

// upstreamURL is the GitHub search URL for this request.
func (s searchRequest) upstreamURL(baseURL string) string {
	return baseURL + "/search/repositories?q=" + jscompat.EncodeURIComponent(s.query) +
		"&sort=" + s.sort.sort +
		"&order=" + s.sort.order +
		"&page=" + strconv.FormatInt(s.page, 10) +
		"&per_page=" + strconv.FormatInt(s.perPage, 10)
}

// valueOr returns the first value for name, or fallback when the value is
// missing or empty, like `searchParams.get(name) || fallback` in JavaScript.
func valueOr(params jscompat.Query, name, fallback string) string {
	if v, _ := params.Get(name); v != "" {
		return v
	}
	return fallback
}

// clamp converts a whole number already accepted by integerPattern and limits
// it to [lo, hi]. The error is safely ignored: the pattern guarantees digits,
// so the only possible error is ErrRange, and then ParseInt returns the
// largest or smallest int64, which clamps like any other number.
func clamp(s string, lo, hi int64) int64 {
	n, _ := strconv.ParseInt(s, 10, 64)
	return min(max(n, lo), hi)
}

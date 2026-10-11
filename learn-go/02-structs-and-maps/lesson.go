package lesson02

// sortOption is what one of our filter names means to GitHub.
type sortOption struct {
	sort  string
	order string
}

// sortOptions is a smaller copy of the table in
// backend/internal/githubsearch/request.go.
var sortOptions = map[string]sortOption{
	"all":      {sort: "", order: "desc"},
	"latest":   {sort: "updated", order: "desc"},
	"featured": {sort: "stars", order: "desc"},
}

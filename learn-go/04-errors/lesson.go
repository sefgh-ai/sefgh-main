package lesson04

import "errors"

// errInvalidPage is returned when a page is not a whole number.
var errInvalidPage = errors.New("page must be a whole number")

// maxPage is the highest page GitHub can serve.
const maxPage = 1000

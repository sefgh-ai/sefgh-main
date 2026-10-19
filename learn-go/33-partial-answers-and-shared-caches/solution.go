//go:build solution

package lesson33

func answer(complete, total int) (status int, cacheControl string) {
	switch complete {
	case 0:
		return 502, noStore
	case total:
		return 200, cacheComplete
	}
	return 200, cachePartial
}

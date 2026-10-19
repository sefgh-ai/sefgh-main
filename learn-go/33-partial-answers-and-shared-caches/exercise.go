//go:build !solution

package lesson33

// answer is the status and Cache-Control header for an answer in which
// complete of total searches worked.
//
// TODO:
//  1. No search worked (complete is 0): 502 and noStore. Check this first:
//     with no searches at all, there is nothing worth caching.
//  2. Every search worked: 200 and cacheComplete.
//  3. Otherwise some worked: 200 and cachePartial.
func answer(complete, total int) (status int, cacheControl string) {
	return 0, ""
}

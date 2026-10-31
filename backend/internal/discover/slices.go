// Package discover contains offline building blocks for the replacement
// ingestion worker. Nothing in this package starts the legacy worker.
package discover

import (
	"errors"
	"time"
)

// Slice has inclusive calendar-day and nonnegative star bounds. A nil StarsMax
// means no upper bound. These are planner values, not raw GitHub query strings.
type Slice struct {
	CreatedFrom string
	CreatedTo   string
	StarsMin    int64
	StarsMax    *int64
}

type Kind string

const (
	Enumerate     Kind = "enumerate" // Eligible for paging, not proof of completion.
	Split         Kind = "split"
	NeedStarBound Kind = "need-star-bound"
	Blocked       Kind = "blocked"
)

type Decision struct {
	Kind     Kind
	Children []Slice
}

// Plan splits a complete count above GitHub's 1000-result search ceiling.
// It never marks work complete. The future executor must separately prove
// successful page exhaustion and atomically persist output and its cursor.
func Plan(s Slice, count int64, incomplete bool) (Decision, error) {
	from, err := day(s.CreatedFrom)
	if err != nil {
		return Decision{}, err
	}
	to, err := day(s.CreatedTo)
	if err != nil {
		return Decision{}, err
	}
	if to.Before(from) || s.StarsMin < 0 || (s.StarsMax != nil && *s.StarsMax < s.StarsMin) || count < 0 {
		return Decision{}, errors.New("discover: invalid slice or count")
	}
	if incomplete {
		return Decision{}, errors.New("discover: incomplete search count")
	}
	if count <= 1000 {
		return Decision{Kind: Enumerate}, nil
	}
	left, right := clone(s), clone(s)
	if !from.Equal(to) {
		// Unix seconds avoid time.Duration's ~290-year limit. Both endpoints
		// are UTC midnight, so the difference is an exact number of days.
		days := (to.Unix() - from.Unix()) / 86400
		mid := time.Unix(from.Unix()+(days/2)*86400, 0).UTC()
		left.CreatedTo = mid.Format(time.DateOnly)
		right.CreatedFrom = mid.AddDate(0, 0, 1).Format(time.DateOnly)
	} else {
		if s.StarsMax == nil {
			return Decision{Kind: NeedStarBound}, nil
		}
		if s.StarsMin == *s.StarsMax {
			return Decision{Kind: Blocked}, nil
		}
		mid := s.StarsMin + (*s.StarsMax-s.StarsMin)/2
		left.StarsMax = &mid
		right.StarsMin = mid + 1
	}
	return Decision{Kind: Split, Children: []Slice{left, right}}, nil
}

func day(s string) (time.Time, error) {
	t, err := time.Parse(time.DateOnly, s)
	if err != nil || t.Year() < 1 || t.Format(time.DateOnly) != s {
		return time.Time{}, errors.New("discover: invalid calendar day")
	}
	return t, nil
}

func clone(s Slice) Slice {
	if s.StarsMax != nil {
		n := *s.StarsMax
		s.StarsMax = &n
	}
	return s
}

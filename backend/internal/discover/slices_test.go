package discover

import (
	"reflect"
	"testing"
	"time"
)

func bound(n int64) *int64 { return &n }

func TestPlanBoundaries(t *testing.T) {
	base := Slice{CreatedFrom: "2024-02-28", CreatedTo: "2024-03-01", StarsMin: 0}
	for _, count := range []int64{0, 999, 1000} {
		d, err := Plan(base, count, false)
		if err != nil || d.Kind != Enumerate || len(d.Children) != 0 {
			t.Fatalf("%d: %+v %v", count, d, err)
		}
	}
	d, err := Plan(base, 1001, false)
	want := []Slice{{"2024-02-28", "2024-02-29", 0, nil}, {"2024-03-01", "2024-03-01", 0, nil}}
	if err != nil || d.Kind != Split || !reflect.DeepEqual(d.Children, want) {
		t.Fatalf("leap split: %+v %v", d, err)
	}
	if base.CreatedTo != "2024-03-01" {
		t.Fatal("input mutated")
	}
	base.CreatedFrom = "2024-03-01"
	d, err = Plan(base, 1001, false)
	if err != nil || d.Kind != NeedStarBound {
		t.Fatalf("unbounded stars: %+v %v", d, err)
	}
	base.StarsMax = bound(1)
	d, err = Plan(base, 1001, false)
	if err != nil || d.Kind != Split || len(d.Children) != 2 || *d.Children[0].StarsMax != 0 || d.Children[1].StarsMin != 1 {
		t.Fatalf("star split: %+v %v", d, err)
	}
	base.StarsMax = bound(0)
	d, err = Plan(base, 1001, false)
	if err != nil || d.Kind != Blocked || len(d.Children) != 0 {
		t.Fatalf("terminal slice: %+v %v", d, err)
	}
}

func TestPlanRejectsInvalidAndIncomplete(t *testing.T) {
	valid := Slice{"2024-01-01", "2024-01-02", 0, nil}
	for _, s := range []Slice{
		{"2023-02-29", "2024-01-02", 0, nil}, {"2024-1-01", "2024-01-02", 0, nil},
		{"0000-01-01", "2024-01-02", 0, nil}, {"2024-02-01", "2024-01-02", 0, nil},
		{"2024-01-01", "2024-01-02", -1, nil}, {"2024-01-01", "2024-01-02", 5, bound(4)},
	} {
		if _, err := Plan(s, 0, false); err == nil {
			t.Fatalf("accepted %+v", s)
		}
	}
	if _, err := Plan(valid, -1, false); err == nil {
		t.Fatal("negative count accepted")
	}
	for _, count := range []int64{0, 1001} {
		if _, err := Plan(valid, count, true); err == nil {
			t.Fatal("incomplete result accepted")
		}
	}
}

func TestStarPartitionHasExactCoverageAndIndependentBounds(t *testing.T) {
	for low := int64(0); low < 20; low++ {
		for high := low + 1; high < 30; high++ {
			s := Slice{"2024-01-01", "2024-01-01", low, bound(high)}
			d, err := Plan(s, 1001, false)
			if err != nil || len(d.Children) != 2 {
				t.Fatalf("%+v %v", d, err)
			}
			a, b := d.Children[0], d.Children[1]
			if a.StarsMin != low || *a.StarsMax+1 != b.StarsMin || *b.StarsMax != high {
				t.Fatal("gap or overlap")
			}
			*a.StarsMax = -1
			*b.StarsMax = -1
			if *s.StarsMax != high {
				t.Fatal("child aliases parent")
			}
		}
	}
	s := Slice{"0001-01-01", "9999-12-31", 0, bound(9223372036854775807)}
	d, err := Plan(s, 1001, false)
	if err != nil || d.Kind != Split {
		t.Fatalf("large dates: %+v %v", d, err)
	}
	s.CreatedTo = s.CreatedFrom
	d, err = Plan(s, 1001, false)
	if err != nil || *d.Children[0].StarsMax != 4611686018427387903 {
		t.Fatalf("integer overflow: %+v %v", d, err)
	}
}

func TestDatePartitionHasExactCoverage(t *testing.T) {
	start, _ := time.Parse(time.DateOnly, "2023-12-20")
	for days := 1; days < 500; days++ {
		end := start.AddDate(0, 0, days)
		d, err := Plan(Slice{start.Format(time.DateOnly), end.Format(time.DateOnly), 7, bound(15)}, 1001, false)
		if err != nil || len(d.Children) != 2 {
			t.Fatalf("%+v %v", d, err)
		}
		a, b := d.Children[0], d.Children[1]
		mid, _ := time.Parse(time.DateOnly, a.CreatedTo)
		if a.CreatedFrom != start.Format(time.DateOnly) || b.CreatedTo != end.Format(time.DateOnly) || b.CreatedFrom != mid.AddDate(0, 0, 1).Format(time.DateOnly) || mid.Before(start) || !mid.Before(end) {
			t.Fatal("date gap, overlap or nonprogress")
		}
		if a.StarsMin != 7 || b.StarsMin != 7 || *a.StarsMax != 15 || *b.StarsMax != 15 {
			t.Fatal("star bounds changed")
		}
	}
}

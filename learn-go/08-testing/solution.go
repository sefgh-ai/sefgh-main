//go:build solution

package lesson08

var starsCases = []starsCase{
	{in: ">100", want: true},
	{in: "*", want: true},
	{in: "100", want: true},
	{in: "10..50", want: true}, // catches "forgot ranges"
	{in: "<=5", want: true},
	{in: "", want: false},
	{in: "many", want: false},
	{in: "10..", want: false},
	{in: ">", want: false},         // catches "comparison with no number"
	{in: "100 stars", want: false}, // catches "forgot the anchors"
	{in: "user:x >5", want: false}, // someone trying to sneak in another filter
}

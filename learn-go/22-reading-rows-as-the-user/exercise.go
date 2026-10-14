//go:build !solution

package lesson22

// tenths says how many tenths x is, rounded as JavaScript's x.toFixed(1)
// rounds: to the nearest, and up when x is exactly halfway. x is never
// negative. tenths(0.25) is 3, tenths(0.35) is 3, tenths(1.45) is 14.
//
// TODO:
//  1. exact := new(big.Rat).SetFloat64(x)
//  2. Multiply exact by 10 (big.NewRat(10, 1)), then add big.NewRat(1, 2).
//  3. Return new(big.Int).Quo(exact.Num(), exact.Denom()).Int64().
//
// You will need to import "math/big".
func tenths(x float64) int64 {
	return -1
}

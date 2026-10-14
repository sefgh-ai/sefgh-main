//go:build solution

package lesson22

import "math/big"

func tenths(x float64) int64 {
	exact := new(big.Rat).SetFloat64(x)
	exact.Mul(exact, big.NewRat(10, 1))
	exact.Add(exact, big.NewRat(1, 2))
	return new(big.Int).Quo(exact.Num(), exact.Denom()).Int64()
}

// searchparity reads local frozen runs only. It has no provider/database client.
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"os"

	"github.com/Adeel0-0/sefgh-nextjs-main/backend/internal/searchparity"
)

func main() { os.Exit(run(os.Args[1:], os.Stdout, os.Stderr)) }

func run(args []string, out, errOut io.Writer) int {
	f := flag.NewFlagSet("searchparity", flag.ContinueOnError)
	f.SetOutput(errOut)
	base := f.String("baseline", "", "local baseline JSON")
	candidate := f.String("candidate", "", "local candidate JSON")
	k := f.Int("k", 10, "compare the first k results (1..1000)")
	tolerance := f.Float64("score-tolerance", 0.000001, "absolute score tolerance, not a retrieval-quality threshold")
	if err := f.Parse(args); err != nil {
		return 2
	}
	if *base == "" || *candidate == "" || f.NArg() != 0 {
		fmt.Fprintln(errOut, "provide -baseline and -candidate local files")
		return 2
	}
	read := func(path string) (searchparity.Run, error) {
		file, err := os.Open(path)
		if err != nil {
			return searchparity.Run{}, err
		}
		defer file.Close()
		return searchparity.Read(file)
	}
	b, err := read(*base)
	if err != nil {
		fmt.Fprintln(errOut, "baseline:", err)
		return 2
	}
	c, err := read(*candidate)
	if err != nil {
		fmt.Fprintln(errOut, "candidate:", err)
		return 2
	}
	report, err := searchparity.Compare(b, c, *k, *tolerance)
	if err != nil {
		fmt.Fprintln(errOut, err)
		return 2
	}
	encoder := json.NewEncoder(out)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(report); err != nil {
		fmt.Fprintln(errOut, err)
		return 2
	}
	if !report.Parity {
		return 1
	}
	return 0
}

package lesson44

type receipt struct {
	id    string
	known bool
}

type completer interface {
	Complete(string) error
}

type progress struct {
	completed, missing, scanned int
	more                        bool
}

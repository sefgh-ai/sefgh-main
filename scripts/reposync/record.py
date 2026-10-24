"""Record contracts/reposync from the original Python RepoSync worker.

Runs RepoSync's own code against a local fake GitHub GraphQL endpoint and a
fake PostgREST server, one case per fresh process. Nothing reaches GitHub or a
database: the Supabase URL is the fake, and GITHUB_GRAPHQL_URL is replaced.
Only main.py, db_writers.py and shared_logger.py are copied into a temporary
folder, so RepoSync's .env is never read.

    python scripts/reposync/record.py --source D:/SEFGH/RepoSync          # check
    python scripts/reposync/record.py --source D:/SEFGH/RepoSync --write  # record

Use the pinned packages in contracts/reposync/README.md. The original writes
its monitoring rows on background threads; for a stable order they run inline
here. Timestamps are replaced by their format, measured durations by a
placeholder.
"""
import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[2]
CASES = ROOT / "contracts" / "reposync" / "cases.json"
QUERIES = ROOT / "contracts" / "reposync" / "queries.json"
SOURCE_FILES = ["main.py", "db_writers.py", "shared_logger.py"]
SERVICE_KEY = "fixture.service-role.key"
MEASURED = {"response_time_ms", "avg_page_time_sec", "total_duration_sec",
            "uptime_seconds", "eta_seconds", "eta_base_seconds"}
NAIVE = re.compile(r"^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?$")
ZULU = re.compile(r"^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z$")
OFFSET = re.compile(r"^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?[+-]\d\d:\d\d$")


def normalize(value, key=None):
    if isinstance(value, dict):
        return {k: normalize(v, k) for k, v in value.items()}
    if isinstance(value, list):
        return [normalize(v) for v in value]
    if key in MEASURED and isinstance(value, (int, float)) and not isinstance(value, bool):
        return "<measured>"
    if isinstance(value, str):
        if NAIVE.match(value):
            return "<time:naive>"
        if ZULU.match(value):
            return "<time:Z>"
        if OFFSET.match(value):
            return "<time:offset>"
    return value


def sort_columns(query):
    # postgrest-py builds a bulk insert's columns= from a Python set, whose
    # order changes between runs. The contract pins the set, sorted.
    parts = []
    for part in query.split("&") if query else []:
        if part.startswith("columns="):
            part = "columns=" + ",".join(sorted(part[len("columns="):].split(",")))
        parts.append(part)
    return "&".join(parts)


class Fake:
    """Serves one case's GitHub and PostgREST replies and records requests."""

    def __init__(self, case, queries):
        self.case = case
        self.queries = {text: name for name, text in queries.items()}
        self.github = list(case["setup"].get("github", []))
        self.calls = []
        self.lock = threading.Lock()

    def handle(self, method, raw_path, headers, body):
        path, _, query = raw_path.partition("?")
        parsed = json.loads(body) if body else None
        auth = headers.get("Authorization", "")
        with self.lock:
            if path == "/graphql":
                keys = self.case["setup"]["keys"]
                token = auth.removeprefix("Bearer ")
                name = self.queries.get(parsed["query"], "UNKNOWN QUERY")
                self.calls.append({"to": "github", "key": keys.index(token) + 1 if token in keys else token,
                                   "query": name, "variables": parsed["variables"]})
                if not self.github:
                    return 500, {}, {"message": "fixture: no GitHub reply left"}
                reply = self.github.pop(0)
                return reply.get("status", 200), reply.get("headers", {}), reply.get("body", {})
            call = {"to": "database", "method": method, "path": path, "query": sort_columns(unquote(query)),
                    "authorization": "Bearer <service-key>" if auth == f"Bearer {SERVICE_KEY}" else auth,
                    "apikey": "<service-key>" if headers.get("apikey") == SERVICE_KEY else headers.get("apikey"),
                    "prefer": headers.get("Prefer")}
            if parsed is not None:
                call["body"] = normalize(parsed)
            self.calls.append(call)
            return self.database(method, path, query, parsed)

    def database(self, method, path, query, body):
        db = self.case["setup"].get("database", {})
        table = path.removeprefix("/rest/v1/")
        if table == "topic_list" and method == "GET":
            return 200, {}, self.case["setup"]["topics"]
        if table == "repositories" and method == "GET":
            if "repo_id=eq." in query:
                repo_id = int(query.split("repo_id=eq.")[1].split("&")[0])
                return 200, {}, [{"id": 1}] if repo_id in db.get("existing_repo_ids", []) else []
            return 200, {"Content-Range": f"0-0/{db.get('repository_count', 0)}"}, []
        if table == "repositories" and method == "POST":
            if body.get("full_name") in db.get("insert_conflicts", []):
                return 409, {}, {"code": "23505", "details": None, "hint": None,
                                 "message": "duplicate key value violates unique constraint \"repositories_full_name_key\""}
            return 201, {}, [body]
        if method in ("PATCH", "POST"):
            return (200 if method == "PATCH" else 201), {}, []
        if method == "GET":
            return 200, {}, []
        return 404, {}, {"message": "fixture: unexpected request"}


def run_case(case_id, source):
    case = next(c for c in json.loads(CASES.read_text(encoding="utf-8"))["cases"] if c["id"] == case_id)
    fake = Fake(case, json.loads(QUERIES.read_text(encoding="utf-8")))

    class Handler(BaseHTTPRequestHandler):
        def _serve(self):
            length = int(self.headers.get("Content-Length") or 0)
            body = self.rfile.read(length).decode() if length else ""
            status, extra, reply = fake.handle(self.command, self.path, self.headers, body)
            data = json.dumps(reply).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            for k, v in extra.items():
                self.send_header(k, str(v))
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        do_GET = do_POST = do_PATCH = do_HEAD = _serve

        def log_message(self, *args):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    origin = f"http://127.0.0.1:{server.server_port}"

    setup = case["setup"]
    os.environ.update({
        "SUPABASE_URL": origin, "SUPABASE_SERVICE_ROLE_KEY": SERVICE_KEY,
        "GITHUB_API_KEYS": ",".join(setup["keys"]),
        "GITHUB_API_KEY_NAMES": ",".join(setup.get("key_names", [])),
        "COST_PER_POINT_USD": str(setup.get("cost_per_point_usd", "")),
    })

    # Monitoring writes run inline: db_writers binds Thread at import.
    class InlineThread:
        def __init__(self, target=None, args=(), kwargs=None, daemon=None):
            self.target, self.args, self.kwargs = target, args, kwargs or {}

        def start(self):
            self.target(*self.args, **self.kwargs)
    real_thread = threading.Thread
    threading.Thread = InlineThread

    import datetime as dt
    import time

    class Clock(dt.datetime):
        # Fixed instant. now() is local time in Asia/Calcutta, as on the
        # machine RepoSync ran on, so naive local writes stay distinguishable.
        @classmethod
        def utcnow(cls):
            return cls(2026, 10, 24, 12, 0, 0)

        @classmethod
        def now(cls, tz=None):
            return cls(2026, 10, 24, 17, 30, 0)

    sleeps = []
    time.sleep = lambda seconds: sleeps.append(seconds)

    sys.path.insert(0, source)
    devnull = open(os.devnull, "w", encoding="utf-8")
    stdout, sys.stdout = sys.stdout, devnull
    try:
        import shared_logger
        import db_writers
        import main
        threading.Thread = real_thread
        for module in (main, db_writers, shared_logger):
            module.datetime = Clock
        main.GITHUB_GRAPHQL_URL = f"{origin}/graphql"
        manager = main.RateLimitManager(main.GITHUB_API_KEYS)
        # An uncaught exception stops the real worker. Record it as the outcome.
        result, raised = None, None
        try:
            result = main.process_pending_topics(manager)
        except Exception as error:
            raised = f"{type(error).__name__}: {error}"
        if raised is None:  # a crash ends the process before any flush
            db_writers.flush_pending_writes()
    finally:
        sys.stdout = stdout
        server.shutdown()

    merged = []
    for s in sleeps:
        if merged and merged[-1][0] == s:
            merged[-1][1] += 1
        else:
            merged.append([s, 1])
    return {
        "result": result,
        "raised": raised,
        "calls": fake.calls,
        "sleeps": [{"seconds": s, "times": n} for s, n in merged],
        "keys": {"current_key": manager.current_key_index + 1, "backoff_seconds": manager.backoff_time,
                 "exhausted": [k["is_exhausted"] for k in manager.keys_info]},
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--write", action="store_true")
    parser.add_argument("--case")
    parser.add_argument("--workdir")
    parser.add_argument("--allow-changed-source", action="store_true")
    args = parser.parse_args()

    if args.case:
        print(json.dumps(run_case(args.case, args.workdir)))
        return

    source = Path(args.source)
    pinned = json.loads(CASES.read_text(encoding="utf-8"))["source"]["sha256"]
    changed_source = [name for name in SOURCE_FILES
                      if hashlib.sha256((source / name).read_bytes()).hexdigest() != pinned[name]]
    if changed_source and not args.allow_changed_source:
        sys.exit(f"RepoSync source differs from the recorded hashes: {', '.join(changed_source)}. "
                 "Review the change, then rerun with --allow-changed-source and update contracts/reposync/cases.json's source block.")
    with tempfile.TemporaryDirectory() as work:
        for name in SOURCE_FILES:
            shutil.copyfile(source / name, Path(work) / name)
        if any(p.name == ".env" for p in Path(work).iterdir()):
            sys.exit("refusing: a .env file is in the work folder")
        contract = json.loads(CASES.read_text(encoding="utf-8"))
        changed = 0
        for case in contract["cases"]:
            out = subprocess.run([sys.executable, "-I", __file__, "--source", str(source), "--case", case["id"], "--workdir", work],
                                 capture_output=True, text=True, cwd=work, timeout=120)
            if out.returncode != 0:
                sys.exit(f"{case['id']} failed:\n{out.stderr[-2000:]}")
            expect = json.loads(out.stdout.strip().splitlines()[-1])
            if case.get("expect") != expect:
                changed += 1
                print(f"{'recorded' if args.write else 'DIFFERS'}: {case['id']}")
            case["expect"] = expect
        if args.write:
            CASES.write_text(json.dumps(contract, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"{len(contract['cases'])} cases, {changed} {'recorded' if args.write else 'differ'}")
        sys.exit(1 if changed and not args.write else 0)


if __name__ == "__main__":
    main()

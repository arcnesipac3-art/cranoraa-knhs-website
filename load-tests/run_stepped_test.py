"""
KNHS PRISM Portal — Automated Stepped Load Test
================================================
Runs one headless Locust process per load step, collects CSV output,
then prints a research-ready table at the end.

Usage (PowerShell):
    $env:LOADTEST_ADMIN_USERNAME   = "admin@school.com"
    $env:LOADTEST_ADMIN_PASSWORD   = "admin123"
    $env:LOADTEST_TEACHER_USERNAME = "mildred.gomez@deped.edu.ph"
    $env:LOADTEST_TEACHER_PASSWORD = "arcnesipac23"
    $env:LOADTEST_STUDENT_USERNAME = "erergaid99@gmail.com"
    $env:LOADTEST_STUDENT_PASSWORD = "arcnesipac23"

    cd "c:\\Users\\GIGABYTE\\OneDrive\\Desktop\\cranoraa-knhs-website-main"
    py load-tests/run_stepped_test.py

Requirements:
    pip install locust
"""

import subprocess
import sys
import os
import csv
import time

# ── Configuration ─────────────────────────────────────────────────────────────

HOST        = "https://cranoraa-knhs-website-1.onrender.com"
LOCUSTFILE  = "load-tests/locustfile.py"
SPAWN_RATE  = 5       # users added per second during ramp-up
RUN_SECONDS = 60      # measurement window per step (1 minute)
STEPS       = [10, 50, 100, 200]
CSV_DIR     = "load-tests/step_results"

# ── Credential check ──────────────────────────────────────────────────────────

REQUIRED_VARS = [
    "LOADTEST_ADMIN_USERNAME",   "LOADTEST_ADMIN_PASSWORD",
    "LOADTEST_TEACHER_USERNAME", "LOADTEST_TEACHER_PASSWORD",
    "LOADTEST_STUDENT_USERNAME", "LOADTEST_STUDENT_PASSWORD",
]


def check_credentials():
    missing = [k for k in REQUIRED_VARS if not os.environ.get(k)]
    if missing:
        print("\nERROR: Missing environment variables:")
        for k in missing:
            print(f"  {k}")
        print("\nSet them before running. See the docstring at the top of this file.")
        sys.exit(1)


# ── Run one Locust step ───────────────────────────────────────────────────────

def run_step(users, step_index):
    """
    Run Locust headlessly for `users` concurrent users.
    Saves CSV output to CSV_DIR/step_<users>.csv.
    Returns the path to the stats CSV file.
    """
    os.makedirs(CSV_DIR, exist_ok=True)
    csv_prefix = os.path.join(CSV_DIR, f"step_{users:04d}")

    cmd = [
        sys.executable, "-m", "locust",
        "-f", LOCUSTFILE,
        "--host", HOST,
        "--headless",
        "--users", str(users),
        "--spawn-rate", str(SPAWN_RATE),
        "--run-time", f"{RUN_SECONDS}s",
        "--csv", csv_prefix,
        "--csv-full-history",
        "--loglevel", "WARNING",     # suppress INFO spam
        "--exit-code-on-error", "0", # don't fail the script on any failures
    ]

    print(f"\n{'─' * 60}")
    print(f"  Step {step_index + 1}/{len(STEPS)}: {users} user(s) × {RUN_SECONDS}s")
    print(f"{'─' * 60}")

    start = time.time()
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        env=os.environ.copy(),
    )
    elapsed = time.time() - start

    # Show any errors locust printed
    if result.returncode != 0:
        print(f"  Locust exited with code {result.returncode}")
    if result.stderr.strip():
        # Only show lines that look like real errors
        for line in result.stderr.splitlines():
            if any(w in line.lower() for w in ["error", "exception", "critical", "failed"]):
                print(f"  LOCUST: {line}")

    print(f"  Completed in {elapsed:.0f}s")
    return f"{csv_prefix}_stats.csv"


# ── Parse Locust CSV ──────────────────────────────────────────────────────────

def parse_csv(csv_path, users):
    """
    Parse the Locust *_stats.csv file and return the Aggregated row as a dict.
    Falls back to computing totals if no Aggregated row exists.
    """
    if not os.path.exists(csv_path):
        print(f"  WARNING: CSV not found at {csv_path}")
        return None

    rows = []
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)

    if not rows:
        return None

    # Look for the Aggregated summary row
    for row in rows:
        if row.get("Name") == "Aggregated":
            return _extract(row, users)

    # No aggregated row — sum everything up manually
    total_req  = sum(int(r.get("Request Count", 0) or 0) for r in rows)
    total_fail = sum(int(r.get("Failure Count", 0) or 0) for r in rows)
    avg_rt     = (
        sum(float(r.get("Average Response Time", 0) or 0)
            * int(r.get("Request Count", 0) or 0) for r in rows)
        / total_req if total_req else 0
    )
    p95 = max(
        float(r.get("95%", 0) or r.get("95th Percentile Response Time", 0) or 0)
        for r in rows
    )
    rps = sum(float(r.get("Requests/s", 0) or 0) for r in rows)

    return {
        "users":        users,
        "requests":     total_req,
        "failures":     total_fail,
        "failure_pct":  f"{total_fail / total_req * 100:.1f}%" if total_req else "0.0%",
        "avg_ms":       f"{avg_rt:.0f}",
        "p95_ms":       f"{p95:.0f}",
        "rps":          f"{rps:.2f}",
    }


def _extract(row, users):
    req  = int(row.get("Request Count", 0) or 0)
    fail = int(row.get("Failure Count", 0) or 0)
    avg  = float(row.get("Average Response Time", 0) or 0)

    # Column name varies by Locust version
    p95 = float(
        row.get("95%") or
        row.get("95th Percentile Response Time") or
        row.get("response_time_percentile_0.95") or
        0
    )
    rps = float(row.get("Requests/s", 0) or 0)

    return {
        "users":       users,
        "requests":    req,
        "failures":    fail,
        "failure_pct": f"{fail / req * 100:.1f}%" if req else "0.0%",
        "avg_ms":      f"{avg:.0f}",
        "p95_ms":      f"{p95:.0f}",
        "rps":         f"{rps:.2f}",
    }


# ── Print results table ───────────────────────────────────────────────────────

def print_table(results):
    print("\n\n" + "=" * 76)
    print("  LOAD TEST RESULTS — KNHS PRISM Portal")
    print("=" * 76)

    col = "{:>6} | {:>10} | {:>9} | {:>8} | {:>10} | {:>10} | {:>8}"
    div = "-" * 76

    print(div)
    print(col.format("Users", "Requests", "Failures", "Fail %",
                      "Avg (ms)", "p95 (ms)", "RPS"))
    print(div)

    for r in results:
        if r is None:
            continue
        print(col.format(
            r["users"],
            r["requests"],
            r["failures"],
            r["failure_pct"],
            r["avg_ms"],
            r["p95_ms"],
            r["rps"],
        ))

    print(div)


def save_csv(results):
    out = "load-tests/results.csv"
    with open(out, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["Users", "Requests", "Failures", "Failure Rate",
                         "Avg Response (ms)", "p95 (ms)", "RPS"])
        for r in results:
            if r:
                writer.writerow([
                    r["users"], r["requests"], r["failures"],
                    r["failure_pct"], r["avg_ms"], r["p95_ms"], r["rps"],
                ])
    print(f"\n  Results saved to: {out}")


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    print("=" * 76)
    print("  KNHS PRISM Portal — Stepped Load Test")
    print(f"  Host     : {HOST}")
    print(f"  Steps    : {STEPS}")
    print(f"  Duration : {RUN_SECONDS}s per step  |  Spawn rate: {SPAWN_RATE}/s")
    total_mins = len(STEPS) * (RUN_SECONDS + 10) // 60
    print(f"  Est. total time: ~{total_mins} minutes")
    print("=" * 76)

    check_credentials()

    results = []
    for i, users in enumerate(STEPS):
        csv_path = run_step(users, i)
        result   = parse_csv(csv_path, users)

        if result:
            print(f"  → Requests: {result['requests']}  "
                  f"Failures: {result['failures']}  "
                  f"Avg: {result['avg_ms']}ms  "
                  f"p95: {result['p95_ms']}ms  "
                  f"RPS: {result['rps']}")
        else:
            print("  → Could not parse results for this step.")

        results.append(result)

    print_table(results)
    save_csv(results)
    print("=" * 76)


if __name__ == "__main__":
    main()

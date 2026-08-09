"""
KNHS PRISM Portal — Automated Stepped Load Test
================================================
Runs Locust headlessly at each user level, waits for the run duration,
collects stats from the Locust REST API, then prints a research-ready
table at the end.

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
    pip install locust requests
"""

import subprocess
import sys
import time
import os
import requests
import signal

# ── Configuration ─────────────────────────────────────────────────────────────

HOST        = "https://cranoraa-knhs-website-1.onrender.com"
LOCUSTFILE  = "load-tests/locustfile.py"
WEB_PORT    = 8090          # Internal Locust API port (not opened to browser)
SPAWN_RATE  = 2             # Users added per second
RUN_SECONDS = 120           # How long to hold each load level (2 minutes)
WARMUP_SECS = 10            # Extra seconds after spawning before reading stats

STEPS = [1, 10, 25, 50, 100, 150, 200]

LOCUST_API  = f"http://127.0.0.1:{WEB_PORT}"

# ── Helpers ───────────────────────────────────────────────────────────────────

def wait_for_locust_ready(timeout=30):
    """Poll until the Locust web API responds."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            r = requests.get(f"{LOCUST_API}/stats/requests", timeout=2)
            if r.status_code == 200:
                return True
        except Exception:
            pass
        time.sleep(1)
    return False


def get_stats():
    """Fetch aggregated stats from the Locust REST API."""
    r = requests.get(f"{LOCUST_API}/stats/requests", timeout=5)
    r.raise_for_status()
    data = r.json()

    # Find the Aggregated row
    for entry in data.get("stats", []):
        if entry.get("name") == "Aggregated":
            return entry

    # Fall back: compute from all entries
    stats = data.get("stats", [])
    if not stats:
        return None

    total_reqs     = sum(s.get("num_requests", 0) for s in stats)
    total_fails    = sum(s.get("num_failures", 0) for s in stats)
    avg_rt         = (sum(s.get("avg_response_time", 0) * s.get("num_requests", 0)
                         for s in stats) / total_reqs) if total_reqs else 0
    p95            = max((s.get("response_times", {}).get("95", 0) or 0) for s in stats)
    current_rps    = sum(s.get("current_rps", 0) for s in stats)

    return {
        "num_requests":      total_reqs,
        "num_failures":      total_fails,
        "avg_response_time": avg_rt,
        "response_times":    {"95": p95},
        "current_rps":       current_rps,
    }


def reset_stats():
    """Reset Locust stats counters via the API."""
    try:
        requests.get(f"{LOCUST_API}/stats/reset", timeout=5)
    except Exception:
        pass


def set_user_count(users):
    """Ramp to a new user count via the Locust swarm API."""
    requests.post(
        f"{LOCUST_API}/swarm",
        data={"user_count": users, "spawn_rate": SPAWN_RATE},
        timeout=10,
    )


def stop_swarm():
    try:
        requests.get(f"{LOCUST_API}/stop", timeout=5)
    except Exception:
        pass


def format_ms(ms):
    if ms is None:
        return "—"
    return f"{ms:.0f} ms"


def format_rps(rps):
    if rps is None:
        return "—"
    return f"{rps:.1f}"


def failure_rate(reqs, fails):
    if not reqs:
        return "—"
    return f"{fails / reqs * 100:.1f}%"


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("=" * 70)
    print("  KNHS PRISM Portal — Stepped Load Test")
    print(f"  Host      : {HOST}")
    print(f"  Steps     : {STEPS}")
    print(f"  Duration  : {RUN_SECONDS}s per step  |  Spawn rate: {SPAWN_RATE}/s")
    print("=" * 70)

    # Validate credentials
    required = [
        "LOADTEST_ADMIN_USERNAME", "LOADTEST_ADMIN_PASSWORD",
        "LOADTEST_TEACHER_USERNAME", "LOADTEST_TEACHER_PASSWORD",
        "LOADTEST_STUDENT_USERNAME", "LOADTEST_STUDENT_PASSWORD",
    ]
    missing = [k for k in required if not os.environ.get(k)]
    if missing:
        print("\nERROR: Missing environment variables:")
        for k in missing:
            print(f"  {k}")
        print("\nSet them before running this script. See the docstring at the top.")
        sys.exit(1)

    # Start Locust in headless (worker) mode with its web API enabled
    locust_cmd = [
        sys.executable, "-m", "locust",
        "-f", LOCUSTFILE,
        "--host", HOST,
        "--web-port", str(WEB_PORT),
        "--headless",           # no browser UI — we drive it via API
        "--users", "1",         # start with 1, we'll ramp via API
        "--spawn-rate", str(SPAWN_RATE),
        "--run-time", f"{(RUN_SECONDS + WARMUP_SECS) * len(STEPS) + 120}s",
    ]

    print(f"\nStarting Locust process...")
    proc = subprocess.Popen(
        locust_cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )

    try:
        print("Waiting for Locust API to become ready...", end="", flush=True)
        if not wait_for_locust_ready(timeout=40):
            print(" TIMEOUT")
            print("\nLocust did not start in time. Output:")
            if proc.stdout:
                print(proc.stdout.read())
            sys.exit(1)
        print(" OK")

        results = []

        for users in STEPS:
            print(f"\n{'─' * 60}")
            print(f"  Phase: {users} concurrent user(s)")
            print(f"{'─' * 60}")

            # Reset counters before ramping
            reset_stats()

            # Ramp to target users
            set_user_count(users)
            spawn_wait = max(4, users // SPAWN_RATE + 2)
            print(f"  Ramping up... ({spawn_wait}s)")
            time.sleep(spawn_wait)

            # Extra warmup before recording
            print(f"  Stabilising... ({WARMUP_SECS}s)")
            time.sleep(WARMUP_SECS)

            # Reset again so we only measure the stable period
            reset_stats()

            # Let it run for the measurement window
            print(f"  Measuring... ({RUN_SECONDS}s) ", end="", flush=True)
            for i in range(RUN_SECONDS // 10):
                time.sleep(10)
                print(".", end="", flush=True)
            print()

            # Collect stats
            stats = get_stats()
            if not stats:
                print("  WARNING: Could not retrieve stats for this step.")
                results.append({
                    "users": users,
                    "requests": "—",
                    "failures": "—",
                    "failure_rate": "—",
                    "avg_ms": "—",
                    "p95_ms": "—",
                    "rps": "—",
                })
                continue

            num_req  = stats.get("num_requests", 0)
            num_fail = stats.get("num_failures", 0)
            avg_ms   = stats.get("avg_response_time", 0)
            p95_ms   = (stats.get("response_times") or {}).get("95") or \
                       stats.get("response_time_percentiles", {}).get("0.95") or 0
            rps      = stats.get("current_rps", 0) or \
                       stats.get("total_rps", 0)

            results.append({
                "users":        users,
                "requests":     num_req,
                "failures":     num_fail,
                "failure_rate": failure_rate(num_req, num_fail),
                "avg_ms":       format_ms(avg_ms),
                "p95_ms":       format_ms(p95_ms),
                "rps":          format_rps(rps),
            })

            print(f"  Requests: {num_req}  |  Failures: {num_fail}  |  "
                  f"Avg: {format_ms(avg_ms)}  |  p95: {format_ms(p95_ms)}  |  "
                  f"RPS: {format_rps(rps)}")

        stop_swarm()

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=10)
        except Exception:
            proc.kill()

    # ── Print research table ───────────────────────────────────────────────
    print("\n\n" + "=" * 70)
    print("  RESULTS TABLE — Copy this into your thesis")
    print("=" * 70)

    header  = f"{'Users':>6} | {'Requests':>10} | {'Failures':>9} | " \
              f"{'Fail %':>7} | {'Avg (ms)':>10} | {'p95 (ms)':>10} | {'RPS':>7}"
    divider = "-" * len(header)

    print(divider)
    print(header)
    print(divider)

    for r in results:
        print(
            f"{r['users']:>6} | "
            f"{str(r['requests']):>10} | "
            f"{str(r['failures']):>9} | "
            f"{r['failure_rate']:>7} | "
            f"{r['avg_ms']:>10} | "
            f"{r['p95_ms']:>10} | "
            f"{r['rps']:>7}"
        )

    print(divider)
    print()

    # Also save to a CSV file
    csv_path = "load-tests/results.csv"
    with open(csv_path, "w") as f:
        f.write("Users,Requests,Failures,Failure Rate,Avg Response (ms),p95 (ms),RPS\n")
        for r in results:
            f.write(f"{r['users']},{r['requests']},{r['failures']},"
                    f"{r['failure_rate']},{r['avg_ms']},{r['p95_ms']},{r['rps']}\n")

    print(f"Results also saved to: {csv_path}")
    print("=" * 70)


if __name__ == "__main__":
    main()

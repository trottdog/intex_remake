#!/usr/bin/env python3
"""
Start script for INTEX project - runs backend (.NET) and frontend (Vite) concurrently.
Backend: ASP.NET Core API on https://localhost:7194
Frontend: Vite dev server on http://127.0.0.1:5173
"""

import subprocess
import sys
import threading
import time
import ssl
import urllib.error
import urllib.request
from pathlib import Path

FRONTEND_URL = "http://127.0.0.1:5173"
BACKEND_URL = "https://localhost:7194"
BACKEND_HEALTHCHECK_URL = f"{BACKEND_URL}/api/healthz"


def start_process(command: str, cwd: Path) -> subprocess.Popen:
    """Start a child process with merged stdout/stderr."""
    return subprocess.Popen(
        command,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
        bufsize=1,
        shell=True,
    )


def run_backend():
    """Start the .NET backend API."""
    backend_path = Path(__file__).parent / "backend" / "intex" / "intex"

    if not backend_path.exists():
        print(f"ERROR Backend path not found: {backend_path}")
        return None

    print(f"Starting backend from {backend_path}...")
    return start_process("dotnet run --launch-profile https", backend_path)


def run_frontend():
    """Start the Vite frontend."""
    frontend_path = Path(__file__).parent / "Asset-Manager"

    if not frontend_path.exists():
        print(f"ERROR Frontend path not found: {frontend_path}")
        return None

    print(f"Starting frontend from {frontend_path}...")
    print("   Running: corepack pnpm --filter @workspace/beacon dev")
    return start_process("corepack pnpm --filter @workspace/beacon dev", frontend_path)


def wait_for_backend_ready(timeout_seconds: int = 90) -> bool:
    """Wait until the backend health endpoint responds successfully."""
    deadline = time.time() + timeout_seconds
    ssl_context = ssl._create_unverified_context()
    last_error: str | None = None

    while time.time() < deadline:
        try:
            with urllib.request.urlopen(BACKEND_HEALTHCHECK_URL, context=ssl_context, timeout=5) as response:
                if 200 <= response.status < 300:
                    return True
                last_error = f"HTTP {response.status}"
        except urllib.error.URLError as error:
            last_error = str(error.reason)
        except Exception as error:  # pragma: no cover - best effort for local dev
            last_error = str(error)

        time.sleep(1)

    if last_error:
        print(f"ERROR Backend did not become ready at {BACKEND_HEALTHCHECK_URL}: {last_error}")
    else:
        print(f"ERROR Backend did not become ready at {BACKEND_HEALTHCHECK_URL}")
    return False


def is_backend_ready_now() -> bool:
    """Quick check for an already-running backend instance."""
    ssl_context = ssl._create_unverified_context()
    try:
        with urllib.request.urlopen(BACKEND_HEALTHCHECK_URL, context=ssl_context, timeout=2) as response:
            return 200 <= response.status < 300
    except Exception:
        return False


def clean_output(name: str, line: str) -> str | None:
    """Drop boilerplate while keeping warnings, errors, and meaningful status lines."""
    text = line.strip()
    if not text:
        return None

    if name == "Frontend":
        if text.startswith("> "):
            return None
        if "Local:" in text or "Network:" in text:
            return None
        if "press h + enter to show help" in text:
            return None
        if text.startswith("VITE v"):
            return f"dev server ready at {FRONTEND_URL}"

    if name == "Backend":
        if text.startswith("Using launch settings from "):
            return None
        if text == "Building...":
            return None
        if "Now listening on:" in text:
            return None
        if text == "Application started. Press Ctrl+C to shut down.":
            return f"API ready at {BACKEND_URL}"
        if text.startswith("Hosting environment:"):
            return None
        if text.startswith("Content root path:"):
            return None

    return text


def log_output(process: subprocess.Popen, name: str):
    """Log process output in real-time."""
    try:
        assert process.stdout is not None
        for line in process.stdout:
            cleaned = clean_output(name, line)
            if cleaned is not None:
                print(f"[{name}] {cleaned}")
    except Exception as error:
        print(f"Error reading {name} output: {error}")


def main():
    """Start both backend and frontend."""
    print("=" * 60)
    print("INTEX Development Environment Starter")
    print("=" * 60)
    print()

    backend_managed = False
    backend_process = None

    if is_backend_ready_now():
        print(f"Backend already running at {BACKEND_URL}; reusing existing process.")
    else:
        backend_process = run_backend()
        if not backend_process:
            print("\nERROR Failed to start processes")
            return 1

        backend_thread = threading.Thread(
            target=log_output,
            args=(backend_process, "Backend"),
            daemon=True,
        )
        backend_thread.start()
        backend_managed = True

        print(f"Waiting for backend readiness at {BACKEND_HEALTHCHECK_URL}...")
        if not wait_for_backend_ready():
            try:
                backend_process.terminate()
            except Exception:
                pass
            return 1

    frontend_process = run_frontend()
    if not frontend_process:
        print("\nERROR Failed to start processes")
        try:
            if backend_managed and backend_process is not None:
                backend_process.terminate()
        except Exception:
            pass
        return 1

    print("\nBoth processes started.")
    print("\nAccess points:")
    print(f"   Frontend:  {FRONTEND_URL}")
    print(f"   Backend:   {BACKEND_URL}")
    print("\nPress Ctrl+C to stop all services...\n")

    try:
        frontend_thread = threading.Thread(
            target=log_output,
            args=(frontend_process, "Frontend"),
            daemon=True,
        )

        frontend_thread.start()

        while frontend_process.poll() is None and (not backend_managed or (backend_process is not None and backend_process.poll() is None)):
            time.sleep(1)

        if backend_managed and backend_process is not None and backend_process.poll() is not None:
            print("\nWARNING Backend process exited")
        else:
            print("\nWARNING Frontend process exited")
        return 1

    except KeyboardInterrupt:
        print("\n\nShutting down...")
        try:
            frontend_process.terminate()
            if backend_managed and backend_process is not None:
                backend_process.terminate()
            frontend_process.wait(timeout=5)
            if backend_managed and backend_process is not None:
                backend_process.wait(timeout=5)
            print("All processes stopped gracefully")
            return 0
        except subprocess.TimeoutExpired:
            print("WARNING Force killing processes...")
            frontend_process.kill()
            if backend_managed and backend_process is not None:
                backend_process.kill()
            return 0


if __name__ == "__main__":
    sys.exit(main())

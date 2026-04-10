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
from pathlib import Path

FRONTEND_URL = "http://127.0.0.1:5173"
BACKEND_URL = "https://localhost:7194"


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

    backend_process = run_backend()
    frontend_process = run_frontend()

    if not backend_process or not frontend_process:
        print("\nERROR Failed to start processes")
        return 1

    print("\nBoth processes started.")
    print("\nAccess points:")
    print(f"   Frontend:  {FRONTEND_URL}")
    print(f"   Backend:   {BACKEND_URL}")
    print("\nPress Ctrl+C to stop all services...\n")

    try:
        time.sleep(2)

        backend_thread = threading.Thread(
            target=log_output,
            args=(backend_process, "Backend"),
            daemon=True,
        )
        frontend_thread = threading.Thread(
            target=log_output,
            args=(frontend_process, "Frontend"),
            daemon=True,
        )

        backend_thread.start()
        frontend_thread.start()

        while backend_process.poll() is None or frontend_process.poll() is None:
            time.sleep(1)

        print("\nWARNING One or more processes have exited")
        return 1

    except KeyboardInterrupt:
        print("\n\nShutting down...")
        try:
            frontend_process.terminate()
            backend_process.terminate()
            frontend_process.wait(timeout=5)
            backend_process.wait(timeout=5)
            print("All processes stopped gracefully")
            return 0
        except subprocess.TimeoutExpired:
            print("WARNING Force killing processes...")
            frontend_process.kill()
            backend_process.kill()
            return 0


if __name__ == "__main__":
    sys.exit(main())

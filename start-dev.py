#!/usr/bin/env python3
"""
Start script for INTEX project - runs backend (.NET) and frontend (Vite) concurrently.
Backend: ASP.NET Core API on https://localhost:7194
Frontend: Vite dev server on http://127.0.0.1:5173
"""

import subprocess
import os
import sys
import time
from pathlib import Path

def run_backend():
    """Start the .NET backend API."""
    backend_path = Path(__file__).parent / "backend" / "intex" / "intex"
    
    if not backend_path.exists():
        print(f"❌ Backend path not found: {backend_path}")
        return None
    
    print(f"🚀 Starting backend from {backend_path}...")
    process = subprocess.Popen(
        "dotnet run --launch-profile https",
        cwd=backend_path,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        shell=True
    )
    return process

def run_frontend():
    """Start the Vite frontend."""
    frontend_path = Path(__file__).parent / "Asset-Manager"
    
    if not frontend_path.exists():
        print(f"❌ Frontend path not found: {frontend_path}")
        return None
    
    print(f"🚀 Starting frontend from {frontend_path}...")
    print("   Running: corepack pnpm --filter @workspace/beacon dev")
    process = subprocess.Popen(
        "corepack pnpm --filter @workspace/beacon dev",
        cwd=frontend_path,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        shell=True
    )
    return process

def log_output(process, name):
    """Log process output in real-time."""
    try:
        for line in process.stdout:
            print(f"[{name}] {line.rstrip()}")
    except Exception as e:
        print(f"Error reading {name} output: {e}")

def main():
    """Start both backend and frontend."""
    print("=" * 60)
    print("🏗️  INTEX Development Environment Starter")
    print("=" * 60)
    print()
    
    # Start both processes
    backend_process = run_backend()
    frontend_process = run_frontend()
    
    if not backend_process or not frontend_process:
        print("\n❌ Failed to start processes")
        return 1
    
    print("\n✅ Both processes started!")
    print("\n📍 Access points:")
    print("   Frontend:  http://127.0.0.1:5173")
    print("   Backend:   https://localhost:7194")
    print("\nPress Ctrl+C to stop all services...\n")
    
    # Wait for both processes with output logging
    try:
        time.sleep(2)  # Give processes time to start
        
        # Create threads to log output from both processes
        import threading
        
        backend_thread = threading.Thread(
            target=log_output,
            args=(backend_process, "Backend"),
            daemon=True
        )
        frontend_thread = threading.Thread(
            target=log_output,
            args=(frontend_process, "Frontend"),
            daemon=True
        )
        
        backend_thread.start()
        frontend_thread.start()
        
        # Keep the main script running
        while backend_process.poll() is None or frontend_process.poll() is None:
            time.sleep(1)
        
        print("\n⚠️  One or more processes have exited")
        return 1
        
    except KeyboardInterrupt:
        print("\n\n🛑 Shutting down...")
        try:
            frontend_process.terminate()
            backend_process.terminate()
            frontend_process.wait(timeout=5)
            backend_process.wait(timeout=5)
            print("✅ All processes stopped gracefully")
            return 0
        except subprocess.TimeoutExpired:
            print("⚠️  Force killing processes...")
            frontend_process.kill()
            backend_process.kill()
            return 0

if __name__ == "__main__":
    sys.exit(main())

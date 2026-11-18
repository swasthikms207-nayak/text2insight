"""
Text2Insight - All-in-One Launcher
Runs the FastAPI backend and serves the React frontend at http://127.0.0.1:8000.
"""
import os
import sys
import subprocess
import webbrowser

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, "backend")
    
    root_venv = os.path.join(root_dir, "venv", "Scripts", "python.exe")
    backend_venv = os.path.join(backend_dir, "venv", "Scripts", "python.exe")
    if os.path.exists(root_venv):
        venv_python = root_venv
    elif os.path.exists(backend_venv):
        venv_python = backend_venv
    else:
        venv_python = "python"

    print("=" * 65)
    print("  🚀 Starting Text2Insight AI Data Analyst")
    print("  🌐 Unified Server: http://127.0.0.1:8000")
    print("  🛡️  Safety Sandbox: Read-Only Enforced & AST Checked")
    print("  🎨 Theme: Monochromatic Blue (#1A73E8)")
    print("=" * 65)

    cmd = [
        venv_python,
        "-m", "uvicorn",
        "app.main:app",
        "--app-dir", backend_dir,
        "--host", "127.0.0.1",
        "--port", "8000",
        "--reload"
    ]

    try:
        webbrowser.open("http://127.0.0.1:8000")
    except Exception:
        pass

    try:
        subprocess.run(cmd)
    except KeyboardInterrupt:
        print("\nStopping Text2Insight server. Goodbye!")

if __name__ == "__main__":
    main()

"""
QueryBlue - All-in-One Launcher
Runs the FastAPI backend and serves the React frontend at http://127.0.0.1:8000.
"""
import os
import sys
import subprocess
import webbrowser

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, "backend")
    venv_python = os.path.join(backend_dir, "venv", "Scripts", "python.exe")
    
    if not os.path.exists(venv_python):
        venv_python = "python"

    print("=" * 65)
    print("  🚀 Starting QueryBlue AI Data Analyst")
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
        print("\nStopping QueryBlue server. Goodbye!")

if __name__ == "__main__":
    main()

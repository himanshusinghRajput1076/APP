import subprocess
import re
import sys
import time
import os

def poll_log_for_url(log_path, timeout=45):
    pattern = re.compile(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com")
    start_time = time.time()
    print(f"Waiting for Cloudflare URL in {os.path.basename(log_path)}...")
    while time.time() - start_time < timeout:
        if os.path.exists(log_path):
            with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
                matches = pattern.findall(content)
                if matches:
                    # Return the last match
                    return matches[-1]
        time.sleep(1)
    return None

def run_live():
    python_path = r"C:\Python314\python.exe" if os.path.exists(r"C:\Python314\python.exe") else sys.executable
    # Clean old logs
    logs = ["backend.log", "backend_tunnel.log", "frontend.log", "frontend_tunnel.log"]
    for log in logs:
        if os.path.exists(log):
            try:
                os.remove(log)
            except:
                pass

    print("[1/5] Starting backend server...")
    backend_log = open("backend.log", "w", encoding="utf-8")
    backend_proc = subprocess.Popen(
        [python_path, "-m", "uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"],
        cwd=r"e:\IDEACON\backend",
        stdout=backend_log,
        stderr=subprocess.STDOUT
    )
    time.sleep(3)

    print("[2/5] Starting backend Cloudflare tunnel...")
    backend_tunnel_log = open("backend_tunnel.log", "w", encoding="utf-8")
    backend_tunnel_proc = subprocess.Popen(
        [r"e:\IDEACON\cloudflared.exe", "tunnel", "--url", "http://localhost:8000"],
        cwd=r"e:\IDEACON",
        stdout=backend_tunnel_log,
        stderr=subprocess.STDOUT
    )

    backend_url = poll_log_for_url("backend_tunnel.log")
    if not backend_url:
        print("Error: Failed to obtain Cloudflare URL for backend. Check backend_tunnel.log")
        backend_proc.terminate()
        backend_tunnel_proc.terminate()
        return

    print(f"Backend is live at: {backend_url}")

    # Write backend URL to frontend env
    with open(r"e:\IDEACON\frontend\.env", "w", encoding="utf-8") as f:
        f.write(f"EXPO_PUBLIC_BACKEND_URL={backend_url}\n")
    print("[3/5] Saved backend URL to frontend/.env")

    # Build web app
    print("[4/5] Compiling Expo Web App (this might take 1-2 minutes)...")
    build_proc = subprocess.run(
        "npx expo export -p web",
        shell=True,
        cwd=r"e:\IDEACON\frontend",
        capture_output=True,
        text=True
    )
    if build_proc.returncode != 0:
        print("Expo build failed:")
        print(build_proc.stderr)
        backend_proc.terminate()
        backend_tunnel_proc.terminate()
        return
    print("Expo Web App compiled successfully!")

    # Start frontend server
    print("[5/5] Starting frontend Web Server on port 3000...")
    frontend_log = open("frontend.log", "w", encoding="utf-8")
    frontend_proc = subprocess.Popen(
        [python_path, "-m", "http.server", "3000", "--directory", "dist"],
        cwd=r"e:\IDEACON\frontend",
        stdout=frontend_log,
        stderr=subprocess.STDOUT
    )
    time.sleep(3)

    print("Starting frontend Cloudflare tunnel...")
    frontend_tunnel_log = open("frontend_tunnel.log", "w", encoding="utf-8")
    frontend_tunnel_proc = subprocess.Popen(
        [r"e:\IDEACON\cloudflared.exe", "tunnel", "--url", "http://localhost:3000"],
        cwd=r"e:\IDEACON",
        stdout=frontend_tunnel_log,
        stderr=subprocess.STDOUT
    )

    frontend_url = poll_log_for_url("frontend_tunnel.log")
    if not frontend_url:
        print("Error: Failed to obtain Cloudflare URL for frontend. Check frontend_tunnel.log")
        backend_proc.terminate()
        backend_tunnel_proc.terminate()
        frontend_proc.terminate()
        frontend_tunnel_proc.terminate()
        return

    print("\n" + "="*55)
    print("ALL DONE! Your application is live at:")
    print(f"--> {frontend_url}")
    print("="*55 + "\n")

    # Write URLs to a file
    with open(r"e:\IDEACON\live_url.txt", "w", encoding="utf-8") as f:
        f.write(f"Backend URL: {backend_url}\nFrontend URL: {frontend_url}\n")

    print("Keep this script running to keep the app live. Press Ctrl+C to stop.")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Stopping all servers...")
    finally:
        backend_proc.terminate()
        backend_tunnel_proc.terminate()
        frontend_proc.terminate()
        frontend_tunnel_proc.terminate()
        backend_log.close()
        backend_tunnel_log.close()
        frontend_log.close()
        frontend_tunnel_log.close()

if __name__ == "__main__":
    run_live()

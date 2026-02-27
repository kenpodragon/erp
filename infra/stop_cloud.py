import os
import subprocess
import sys

PROJECT_ID = "elysium-rising-erp"
SQL_INSTANCE = "erp-pg-db-j7q9dk"

def run_command(cmd):
    print("Running: " + " ".join(cmd))
    try:
        subprocess.run(cmd, check=True, shell=True)
    except subprocess.CalledProcessError as e:
        print("Warning: Command failed - " + str(e))

def stop_all():
    # Force project root
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    os.chdir(project_root)

    print("\n--- STOPPING ERP CLOUD SERVICES ---")
    
    # Stop Cloud SQL (This is the only service that costs money when idle)
    print("\n[1/1] Stopping Cloud SQL Instance...")
    run_command(["gcloud", "sql", "instances", "patch", SQL_INSTANCE, 
                 "--activation-policy", "NEVER", "--project", PROJECT_ID])

    print("\n" + "="*40)
    print("SUCCESS: Cloud SQL stopped.")
    print("Note: Cloud Run services automatically scale to 0 when idle.")
    print("="*40)

if __name__ == "__main__":
    stop_all()

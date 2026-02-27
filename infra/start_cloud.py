import os
import subprocess
import sys

PROJECT_ID = "elysium-rising-erp"
REGION = "us-east1"
SQL_INSTANCE = "erp-pg-db-j7q9dk"
SERVICES = ["erp-backend", "erp-frontend", "erp-admin"]

def run_command(cmd):
    print("Running: " + " ".join(cmd))
    try:
        subprocess.run(cmd, check=True, shell=True)
    except subprocess.CalledProcessError as e:
        print("Warning: Command failed - " + str(e))

def start_all():
    # Force project root
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    os.chdir(project_root)

    print("\n--- STARTING ERP CLOUD SERVICES ---")
    
    # 1. Start Cloud SQL
    print("\n[1/2] Starting Cloud SQL Instance...")
    run_command(["gcloud", "sql", "instances", "patch", SQL_INSTANCE, 
                 "--activation-policy", "ALWAYS", "--project", PROJECT_ID])

    # 2. Ensure Cloud Run services are active
    print("\n[2/2] Ensuring Cloud Run services are ready...")
    for svc in SERVICES:
        run_command(["gcloud", "run", "services", "update", svc, 
                     "--max-instances", "10", "--region", REGION, "--project", PROJECT_ID])

    print("\n" + "="*40)
    print("SUCCESS: Cloud SQL is starting up.")
    print("Cloud Run services are configured to scale up on demand.")
    print("Note: DB boot can take ~60 seconds.")
    print("="*40)

if __name__ == "__main__":
    start_all()

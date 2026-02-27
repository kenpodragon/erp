import os
import subprocess
import sys

PROJECT_ID = "elysium-rising-erp"
REGION = "us-east1"

def get_env_vars(env_file):
    """
    Parses a .env file and applies _LIVE postfix logic.
    """
    abs_path = os.path.abspath(env_file)
    if not os.path.exists(env_file):
        print("Warning: File not found at: " + abs_path)
        print("Current Working Directory: " + os.getcwd())
        return []
    
    raw_vars = {}
    with open(env_file, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                parts = line.split('=', 1)
                if len(parts) == 2:
                    key, val = parts
                    raw_vars[key.strip()] = val.strip()
    
    final_vars = {}
    for key, val in raw_vars.items():
        if key.endswith('_LIVE'):
            base_key = key[:-5]
            final_vars[base_key] = val
            
    for key, val in raw_vars.items():
        if not key.endswith('_LIVE'):
            if key not in final_vars and (key + "_LIVE") not in raw_vars:
                final_vars[key] = val

    return [k + "=" + v for k, v in final_vars.items()]

def push_env(name, dir_path):
    print("\n" + "="*40)
    print("Pushing Environment Variables to: erp-" + name + " via Secret Manager")
    print("="*40)
    
    env_file = os.path.join(dir_path, '.env')
    env_content = get_env_vars_content(env_file)
    
    if not env_content:
        print("No variables found to push.")
        return

    secret_name = "erp-" + name + "-env"
    
    # 1. Create or Update Secret
    check_cmd = ["gcloud", "secrets", "describe", secret_name, "--project", PROJECT_ID]
    result = subprocess.run(check_cmd, capture_output=True, text=True, shell=True)
    
    if result.returncode != 0:
        print(f"Creating secret: {secret_name}")
        create_cmd = ["gcloud", "secrets", "create", secret_name, "--replication-policy", "automatic", "--project", PROJECT_ID]
        subprocess.run(create_cmd, check=True, shell=True)
    
    print(f"Adding new version to {secret_name}...")
    add_version_cmd = ["gcloud", "secrets", "versions", "add", secret_name, "--data-file=-", "--project", PROJECT_ID]
    subprocess.run(add_version_cmd, input=env_content, text=True, check=True, shell=True)

    # 2. Grant Access (to default compute SA)
    # We need the project number
    proj_num_cmd = ["gcloud", "projects", "describe", PROJECT_ID, "--format", "value(projectNumber)"]
    proj_num_res = subprocess.run(proj_num_cmd, capture_output=True, text=True, check=True, shell=True)
    project_number = proj_num_res.stdout.strip()
    compute_sa = f"{project_number}-compute@developer.gserviceaccount.com"
    
    grant_cmd = [
        "gcloud", "secrets", "add-iam-policy-binding", secret_name,
        "--member", f"serviceAccount:{compute_sa}",
        "--role", "roles/secretmanager.secretAccessor",
        "--project", PROJECT_ID
    ]
    subprocess.run(grant_cmd, check=True, shell=True)

    # 3. Update Cloud Run to mount the secret
    # Note: Using /app/.env as the mount path
    cmd = [
        "gcloud", "run", "services", "update", "erp-" + name,
        "--update-secrets", f"/app/.env={secret_name}:latest",
        "--region", REGION,
        "--project", PROJECT_ID
    ]
    
    print("Updating Cloud Run service to mount secret...")
    try:
        subprocess.run(cmd, check=True, shell=True)
        print("SUCCESS: Secret updated and mounted for " + name)
    except subprocess.CalledProcessError as e:
        print("ERROR: Failed to update Cloud Run for " + name)

def get_env_vars_content(env_file):
    """
    Parses a .env file and applies _LIVE postfix logic, returning formatted content.
    """
    if not os.path.exists(env_file):
        return None
    
    raw_vars = {}
    with open(env_file, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                raw_vars[k.strip()] = v.strip()
    
    final_vars = {}
    for k, v in raw_vars.items():
        if k.endswith('_LIVE'): final_vars[k[:-5]] = v
        elif k not in final_vars and (k + '_LIVE') not in raw_vars: final_vars[k] = v
    
    return "\n".join([f"{k}={v}" for k, v in final_vars.items()])

def main():
    # Force the script to look for files relative to the project root
    # assuming the script is in /infra
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    os.chdir(project_root)

    services = [
        {"name": "backend", "path": "backend"},
        {"name": "frontend", "path": "frontend"},
        {"name": "admin", "path": "admin"},
    ]
    
    for svc in services:
        push_env(svc["name"], svc["path"])
    
    print("\n" + "*"*40)
    print("ALL ENVIRONMENT UPDATES COMPLETE")
    print("*"*40)

if __name__ == "__main__":
    main()

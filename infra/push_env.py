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
    print("Pushing Environment Variables to: erp-" + name)
    print("="*40)
    
    env_file = os.path.join(dir_path, '.env')
    env_vars = get_env_vars(env_file)
    
    if not env_vars:
        print("No variables found to push.")
        return

    env_str = ",".join(env_vars)
    
    cmd = [
        "gcloud", "run", "services", "update", "erp-" + name,
        "--set-env-vars", env_str,
        "--region", REGION,
        "--project", PROJECT_ID
    ]
    
    print("Running gcloud update...")
    try:
        subprocess.run(cmd, check=True, shell=True)
        print("SUCCESS: Variables updated for " + name)
    except subprocess.CalledProcessError as e:
        print("ERROR: Failed to update variables for " + name)

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

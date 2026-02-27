import os
import subprocess
import sys
import yaml
import tempfile

PROJECT_ID = "elysium-rising-erp"
REGION = "us-east1"

def get_env_vars_dict(env_file):
    """
    Parses a .env file and applies _LIVE postfix logic.
    Returns a dictionary of {KEY: VAL}.
    """
    if not os.path.exists(env_file):
        print("Warning: " + env_file + " not found.")
        return {}
    
    raw_vars = {}
    with open(env_file, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                if '=' in line:
                    key, val = line.split('=', 1)
                    raw_vars[key.strip()] = val.strip()
    
    final_vars = {}
    # 1. Apply _LIVE logic
    for key, val in raw_vars.items():
        if key.endswith('_LIVE'):
            base_key = key[:-5]
            final_vars[base_key] = val
            
    # 2. Fill in the rest
    for key, val in raw_vars.items():
        if not key.endswith('_LIVE'):
            if key not in final_vars: 
                if (key + "_LIVE") not in raw_vars:
                    final_vars[key] = val

    return final_vars

def push_env(name, dir_path):
    print("\n" + "="*40)
    print("Pushing Environment Variables to: erp-" + name)
    print("="*40)
    
    env_file = os.path.join(dir_path, '.env')
    env_vars = get_env_vars_dict(env_file)
    
    if not env_vars:
        print("No variables found to push.")
        return

    # Use a temporary YAML file to avoid shell escaping issues with JSON strings
    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.yaml') as tf:
        yaml.dump(env_vars, tf)
        temp_path = tf.name

    try:
        cmd = [
            "gcloud", "run", "services", "update", "erp-" + name,
            "--env-vars-file", temp_path,
            "--region", REGION,
            "--project", PROJECT_ID
        ]
        
        print("Running gcloud update...")
        subprocess.run(cmd, check=True, shell=True)
        print("SUCCESS: Variables updated for " + name)
    except subprocess.CalledProcessError as e:
        print("ERROR: Failed to update variables for " + name)
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

def main():
    # Force the script to look for files relative to the project root
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

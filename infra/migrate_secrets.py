import os
import subprocess
import sys

PROJECT_ID = "elysium-rising-erp"
REGION = "us-east1"

def get_final_env_content(env_file):
    """
    Parses a .env file, applies _LIVE postfix logic, and returns the content as a string.
    """
    if not os.path.exists(env_file):
        print(f"Warning: File not found: {env_file}")
        return None
    
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
    # Apply _LIVE logic
    for key, val in raw_vars.items():
        if key.endswith('_LIVE'):
            base_key = key[:-5]
            final_vars[base_key] = val
            
    for key, val in raw_vars.items():
        if not key.endswith('_LIVE'):
            if key not in final_vars and (key + "_LIVE") not in raw_vars:
                final_vars[key] = val

    return "\n".join([f"{k}={v}" for k, v in final_vars.items()])

def create_or_update_secret(secret_name, content):
    """
    Creates a secret if it doesn't exist, and adds a new version with the provided content.
    """
    # Check if secret exists
    check_cmd = ["gcloud", "secrets", "describe", secret_name, "--project", PROJECT_ID]
    result = subprocess.run(check_cmd, capture_output=True, text=True, shell=True)
    
    if result.returncode != 0:
        print(f"Creating secret: {secret_name}")
        create_cmd = ["gcloud", "secrets", "create", secret_name, "--replication-policy", "automatic", "--project", PROJECT_ID]
        subprocess.run(create_cmd, check=True, shell=True)
    else:
        print(f"Secret {secret_name} already exists.")

    # Add new version
    print(f"Adding new version to {secret_name}...")
    add_version_cmd = ["gcloud", "secrets", "versions", "add", secret_name, "--data-file=-", "--project", PROJECT_ID]
    subprocess.run(add_version_cmd, input=content, text=True, check=True, shell=True)
    print(f"Successfully updated {secret_name}")

def grant_access_to_secret(secret_name, service_account):
    """
    Grants Secret Manager Secret Accessor role to the specified service account.
    """
    print(f"Granting access to {secret_name} for {service_account}...")
    grant_cmd = [
        "gcloud", "secrets", "add-iam-policy-binding", secret_name,
        "--member", f"serviceAccount:{service_account}",
        "--role", "roles/secretmanager.secretAccessor",
        "--project", PROJECT_ID
    ]
    subprocess.run(grant_cmd, check=True, shell=True)

def main():
    # Force the script to look for files relative to the project root
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    os.chdir(project_root)

    # We assume the default Cloud Run service account is used
    # Format: PROJECT_NUMBER-compute@developer.gserviceaccount.com
    # To get project number:
    result = subprocess.run(["gcloud", "projects", "describe", PROJECT_ID, "--format", "value(projectNumber)"], 
                            capture_output=True, text=True, check=True, shell=True)
    project_number = result.stdout.strip()
    compute_sa = f"{project_number}-compute@developer.gserviceaccount.com"
    
    services = [
        {"name": "backend", "path": "backend", "secret": "erp-backend-env"},
        {"name": "frontend", "path": "frontend", "secret": "erp-frontend-env"},
        {"name": "admin", "path": "admin", "secret": "erp-admin-env"},
    ]
    
    for svc in services:
        env_file = os.path.join(svc["path"], ".env")
        content = get_final_env_content(env_file)
        if content:
            create_or_update_secret(svc["secret"], content)
            grant_access_to_secret(svc["secret"], compute_sa)
        else:
            print(f"Skipping {svc['name']} because .env was not found.")
    
    print("\n" + "*"*40)
    print("MIGRATION COMPLETE")
    print("Secrets have been pushed to Google Secret Manager.")
    print("Cloud Run services can now mount these as .env files.")
    print("*"*40)

if __name__ == "__main__":
    main()

import os
import subprocess
import sys

def get_env_vars(env_file):
    if not os.path.exists(env_file):
        print("Warning: " + env_file + " not found.")
        return []
    
    raw_vars = {}
    with open(env_file, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                if '=' in line:
                    key, val = line.split('=', 1)
                    raw_vars[key.strip()] = val.strip()
    
    final_vars = {}
    for key, val in raw_vars.items():
        if key.endswith('_LIVE'):
            base_key = key[:-5]
            final_vars[base_key] = val
        elif key not in final_vars: 
            if (key + "_LIVE") not in raw_vars:
                final_vars[key] = val

    return [k + "=" + v for k, v in final_vars.items()]

def deploy_service(name, dir_path, project_id, region, port, cloud_sql=None):
    print("\n" + "="*40)
    print("Deploying Service: " + name)
    print("="*40)
    
    # Process and Update Secret
    env_file = os.path.join(dir_path, '.env')
    env_content = get_env_vars_content(env_file)
    secret_name = "erp-" + name + "-env"
    
    if env_content:
        # Create or Update Secret
        check_cmd = ["gcloud", "secrets", "describe", secret_name, "--project", project_id]
        result = subprocess.run(check_cmd, capture_output=True, text=True, shell=True)
        if result.returncode != 0:
            subprocess.run(["gcloud", "secrets", "create", secret_name, "--replication-policy", "automatic", "--project", project_id], check=True, shell=True)
        
        subprocess.run(["gcloud", "secrets", "versions", "add", secret_name, "--data-file=-", "--project", project_id], input=env_content, text=True, check=True, shell=True)
        
        # Grant access to compute SA
        proj_num_cmd = ["gcloud", "projects", "describe", project_id, "--format", "value(projectNumber)"]
        proj_num_res = subprocess.run(proj_num_cmd, capture_output=True, text=True, check=True, shell=True)
        compute_sa = f"{proj_num_res.stdout.strip()}-compute@developer.gserviceaccount.com"
        subprocess.run(["gcloud", "secrets", "add-iam-policy-binding", secret_name, "--member", f"serviceAccount:{compute_sa}", "--role", "roles/secretmanager.secretAccessor", "--project", project_id], check=True, shell=True)

    image_tag = region + "-docker.pkg.dev/" + project_id + "/erp-images-lolkids/" + name + ":latest"
    
    print("1. Building & Pushing Image...")
    subprocess.run(["docker", "build", "-t", image_tag, dir_path], check=True, shell=True)
    subprocess.run(["docker", "push", image_tag], check=True, shell=True)
    
    print("2. Deploying to Cloud Run...")
    deploy_cmd = [
        "gcloud", "run", "deploy", "erp-" + name,
        "--image", image_tag,
        "--region", region,
        "--allow-unauthenticated",
        "--port", str(port),
        "--project", project_id
    ]
    
    if cloud_sql:
        deploy_cmd.extend(["--add-cloudsql-instances", cloud_sql])
    
    if env_content:
        # Mount the secret as .env
        deploy_cmd.extend(["--set-secrets", f"/app/.env={secret_name}:latest"])
    
    subprocess.run(deploy_cmd, check=True, shell=True)

def get_env_vars_content(env_file):
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
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    os.chdir(project_root)

    PROJECT_ID = "elysium-rising-erp"
    REGION = "us-east1"
    CLOUD_SQL = "elysium-rising-erp:us-east1:erp-pg-db-j7q9dk"
    
    services = [
        {"name": "backend", "path": "backend", "port": 8000, "use_sql": True},
        {"name": "frontend", "path": "frontend", "port": 5173, "use_sql": False},
        {"name": "admin", "path": "admin", "port": 5174, "use_sql": False},
    ]
    
    try:
        for svc in services:
            sql_inst = CLOUD_SQL if svc["use_sql"] else None
            deploy_service(svc["name"], svc["path"], PROJECT_ID, REGION, svc["port"], sql_inst)
        
        print("\n" + "*"*40)
        print("SUCCESS: All ERP services deployed.")
        print("Game:  https://play.does-god-exist.org")
        print("API:   https://api.does-god-exist.org")
        print("Admin: https://admin.does-god-exist.org")
        print("*"*40)

    except subprocess.CalledProcessError as e:
        print("\nERROR: Deployment failed at command: " + str(e.cmd))
        sys.exit(1)

if __name__ == "__main__":
    main()

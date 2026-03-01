
import os
from sqlmodel import Session, create_engine, select
from models import AdminWhitelistEmail, AdminWhitelistIP, Player, ServerConfig

DATABASE_URL = "postgresql://erp_app_user:NF30tO8IDhoZ4mwfTeieLZEAUw6Yz0t9@35.196.226.159:5432/erp_production"
engine = create_engine(DATABASE_URL)

def check_access_control():
    try:
        with Session(engine) as session:
            # 1. Check Config
            ip_enabled_row = session.get(ServerConfig, "ops.admin_ip_whitelist_enabled")
            ip_enabled = ip_enabled_row.value if ip_enabled_row else "True (Default)"
            print(f"IP Whitelist Enabled: {ip_enabled}")

            # 2. Query Emails
            emails = session.exec(select(AdminWhitelistEmail)).all()
            print("\nWhitelisted Emails:")
            if not emails:
                print(" - (None found)")
            for e in emails:
                print(f" - {e.email} (added by {e.added_by})")
            
            # 3. Query IPs
            ips = session.exec(select(AdminWhitelistIP)).all()
            print("\nWhitelisted IPs:")
            if not ips:
                print(" - (None found)")
            for ip in ips:
                print(f" - {ip.ip_address} (note: {ip.note}, added by {ip.added_by})")

            # 4. Query Admin Players
            print("\nAdmin Players:")
            players = session.exec(select(Player).where((Player.is_system_admin == True) | (Player.is_owner == True))).all()
            if not players:
                print(" - (None found)")
            for p in players:
                print(f" - {p.email} (Owner: {p.is_owner}, SysAdmin: {p.is_system_admin})")
                
    except Exception as e:
        print(f"Error checking DB: {e}")

if __name__ == "__main__":
    check_access_control()

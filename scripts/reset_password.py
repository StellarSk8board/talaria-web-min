#!/usr/bin/env python3
"""Reset password for an existing agent user on eyops Synapse.

Uses a server-admin account (we create one fresh) to call
POST /_synapse/admin/v1/reset_password/<user_id>.

Usage: python3 scripts/reset_password.py <user_id> <new_password>
"""
import hashlib
import hmac
import json
import os
import sys
import urllib.request
import urllib.error

HOMESERVER = "http://100.115.98.81:8008"
SHARED_SECRET = os.environ["SYNAPSE_SHARED_SECRET"]
PASSWORD = os.environ.get("TALARIA_VERIFY_PW", "talaria_verify_pw")


def get(path):
    req = urllib.request.Request(f"{HOMESERVER}{path}", method="GET")
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read())


def post(path, body, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(
        f"{HOMESERVER}{path}",
        data=json.dumps(body).encode(),
        headers=headers,
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())


def get_admin_token():
    """Create a one-shot admin user 'talaria_admin' and return its access token.

    We use the admin register endpoint (which creates an admin user) then
    log it in via m.login.password to get an access token usable for the
    /reset_password/ endpoint.
    """
    # Step 1: register talaria_admin
    nonce = get("/_synapse/admin/v1/register")["nonce"]
    localpart = "talaria_admin"
    mac_builder = hmac.new(SHARED_SECRET.encode(), digestmod=hashlib.sha1)
    mac_builder.update(nonce.encode("utf8"))
    mac_builder.update(b"\x00")
    mac_builder.update(localpart.encode("utf8"))
    mac_builder.update(b"\x00")
    mac_builder.update(PASSWORD.encode("utf8"))
    mac_builder.update(b"\x00")
    mac_builder.update(b"admin")
    mac = mac_builder.hexdigest()
    code, resp = post(
        "/_synapse/admin/v1/register",
        {
            "nonce": nonce,
            "username": localpart,
            "password": PASSWORD,
            "admin": True,
            "mac": mac,
        },
    )
    if code == 200:
        print(f"  registered @talaria_admin:talaria.my (admin)")
    elif resp.get("errcode") == "M_USER_IN_USE":
        print(f"  @talaria_admin:talaria.my already exists (password NOT updated)")
    else:
        print(f"  register failed: HTTP {code} {resp}")
        sys.exit(1)

    # Step 2: log in to get a fresh access token
    code, resp = post("/_matrix/client/v3/login", {
        "type": "m.login.password",
        "identifier": {"type": "m.id.user", "user": localpart},
        "password": PASSWORD,
    })
    if code != 200:
        # Likely rate-limited. Wait and retry once.
        if resp.get("errcode") == "M_LIMIT_EXCEEDED":
            wait_ms = resp.get("retry_after_ms", 60000)
            print(f"  rate-limited, waiting {wait_ms//1000}s...")
            import time
            time.sleep(wait_ms / 1000 + 1)
            code, resp = post("/_matrix/client/v3/login", {
                "type": "m.login.password",
                "identifier": {"type": "m.id.user", "user": localpart},
                "password": PASSWORD,
            })
        if code != 200:
            print(f"  login failed: HTTP {code} {resp}")
            sys.exit(1)
    return resp["access_token"]


def reset_password(token, target_user_id, new_password):
    code, resp = post(
        f"/_synapse/admin/v1/reset_password/{target_user_id}",
        {"new_password": new_password, "logout_devices": False},
        token=token,
    )
    if code == 200:
        print(f"  reset OK: {target_user_id}")
    else:
        print(f"  reset FAILED for {target_user_id}: HTTP {code} {resp}")
        sys.exit(1)


def main():
    if len(sys.argv) < 2:
        print("usage: reset_password.py <target_localpart> [new_password]")
        sys.exit(1)
    target = sys.argv[1]
    new_pw = sys.argv[2] if len(sys.argv) > 2 else PASSWORD
    target_uid = f"@{target}:talaria.my"

    print(f"=== Resetting password for {target_uid} ===\n")
    token = get_admin_token()
    reset_password(token, target_uid, new_pw)
    print("\nDone.")


if __name__ == "__main__":
    main()

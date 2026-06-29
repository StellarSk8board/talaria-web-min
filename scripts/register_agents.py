#!/usr/bin/env python3
"""Register Talaria agents on eyops Synapse via the admin register endpoint.

MAC format per Synapse source (synapse/rest/admin/users.py):
  hmac-sha1(secret, nonce + NUL + username + NUL + password + NUL + ('admin'|'notadmin'))
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
PASSWORD = "talaria_verify_pw"

AGENTS = [
    ("talaria_agent_karn",   "Karn"),
    ("talaria_agent_bob",    "Bob"),
    ("talaria_agent_corso",  "Corso"),
    ("talaria_agent_ordis",  "Ordis"),
    ("talaria_agent_rhinox", "Rhinox"),
]


def get(path):
    req = urllib.request.Request(f"{HOMESERVER}{path}", method="GET")
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read())


def post(path, body):
    req = urllib.request.Request(
        f"{HOMESERVER}{path}",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())


def register(localpart):
    nonce = get("/_synapse/admin/v1/register")["nonce"]
    mac_builder = hmac.new(SHARED_SECRET.encode(), digestmod=hashlib.sha1)
    mac_builder.update(nonce.encode("utf8"))
    mac_builder.update(b"\x00")
    mac_builder.update(localpart.encode("utf8"))
    mac_builder.update(b"\x00")
    mac_builder.update(PASSWORD.encode("utf8"))
    mac_builder.update(b"\x00")
    mac_builder.update(b"admin")
    mac = mac_builder.hexdigest()
    return post(
        "/_synapse/admin/v1/register",
        {
            "nonce": nonce,
            "username": localpart,
            "password": PASSWORD,
            "admin": True,
            "mac": mac,
        },
    )


def main():
    print(f"=== Registering {len(AGENTS)} agents on {HOMESERVER} ===\n")
    for entry in AGENTS:
        localpart, display = entry if isinstance(entry, tuple) else (entry, entry.title())
        code, resp = register(localpart)
        user_id = resp.get("user_id", f"@{localpart}:talaria.my")
        if code == 200:
            print(f"  ok  {user_id}  (created)")
        elif resp.get("errcode") == "M_USER_IN_USE":
            print(f"  ==  {user_id}  (already exists)")
        else:
            print(f"  XX  {user_id}  HTTP {code}: {resp}")
            sys.exit(1)
    print("\nDone.")


if __name__ == "__main__":
    main()

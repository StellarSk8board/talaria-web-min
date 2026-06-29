#!/usr/bin/env python3
"""Lift Synapse rate limits on eyops for a single-user private server.

Writes the correct nested config that Synapse actually reads.
"""
import re
import subprocess
import sys

CONFIG = "/opt/talaria/synapse/homeserver.yaml"

# Read
r = subprocess.run(
    ["ssh", "root@100.115.98.81", f"cat {CONFIG}"],
    capture_output=True, text=True, timeout=10,
)
content = r.stdout

# Replace rc_message block (top-level, no nesting)
content, n_msg = re.subn(
    r"^rc_message:\n  per_second: \d+\n  burst_count: \d+\n",
    "rc_message:\n  per_second: 1000\n  burst_count: 10000\n",
    content, flags=re.MULTILINE,
)

# Replace rc_login with the nested schema Synapse actually reads
content, n_login = re.subn(
    r"^rc_login:\n  per_second: \d+\n  burst_count: \d+\n",
    """rc_login:
  address:
    per_second: 1000
    burst_count: 10000
  account:
    per_second: 1000
    burst_count: 10000
  failed_attempts:
    per_second: 1000
    burst_count: 10000
""",
    content, flags=re.MULTILINE,
)

# Replace rc_joins with nested local/remote/per_room
content, n_joins = re.subn(
    r"^rc_joins:\n  per_second: \d+\n  burst_count: \d+\n",
    """rc_joins:
  local:
    per_second: 1000
    burst_count: 10000
  remote:
    per_second: 1000
    burst_count: 10000
  per_room:
    per_second: 1000
    burst_count: 10000
""",
    content, flags=re.MULTILINE,
)

# Replace rc_invites
content, n_invites = re.subn(
    r"^rc_invites:\n  per_second: \d+\n  burst_count: \d+\n",
    """rc_invites:
  per_room:
    per_second: 1000
    burst_count: 10000
  per_user:
    per_second: 1000
    burst_count: 10000
""",
    content, flags=re.MULTILINE,
)

print(f"replaced: rc_message={n_msg} rc_login={n_login} rc_joins={n_joins} rc_invites={n_invites}")
if not (n_msg == 1 and n_login == 1 and n_joins == 1 and n_invites == 1):
    print("ABORT: expected exactly 1 replacement per block")
    sys.exit(1)

# Write back
r = subprocess.run(
    ["ssh", "root@100.115.98.81", f"cat > {CONFIG}"],
    input=content, capture_output=True, text=True, timeout=10,
)
if r.returncode != 0:
    print(f"ssh write failed: {r.stderr}")
    sys.exit(1)

# Verify
r = subprocess.run(
    ["ssh", "root@100.115.98.81",
     f"grep -A 10 '^rc_\\(message\\|login\\|joins\\|invites\\):' {CONFIG}"],
    capture_output=True, text=True, timeout=10,
)
print("--- after edit ---")
print(r.stdout)

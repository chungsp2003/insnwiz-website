"""Create/update an upload account in a private JSON file, never in the web root."""
import getpass
import hashlib
import json
import os
from pathlib import Path
import secrets
import sys

email, filename = sys.argv[1:]
email = email.strip().lower()
if '@' not in email or len(email) > 254:
    raise SystemExit('Provide a valid email address.')
path = Path(filename).resolve()
if path.is_relative_to(Path(__file__).resolve().parents[1]):
    raise SystemExit('Save this secret outside the website directory.')
password = getpass.getpass('New website password (16+ ASCII characters): ')
if len(password) < 16 or len(password) > 256 or not password.isascii():
    raise SystemExit('Use 16–256 ASCII characters.')
if password != getpass.getpass('Confirm password: '):
    raise SystemExit('Passwords do not match.')
users = json.loads(path.read_text()) if path.exists() else {}
salt = secrets.token_bytes(16)
users[email] = {'salt': salt.hex(), 'hash': hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 100000).hex()}
fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
os.fchmod(fd, 0o600)
with os.fdopen(fd, 'w') as output:
    json.dump(users, output)
print('Account saved. Set UPLOAD_USERS_JSON from the private output file.')

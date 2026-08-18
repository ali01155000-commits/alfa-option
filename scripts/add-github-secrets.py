#!/usr/bin/env python3
"""Add GitHub Actions secrets to the repository"""
import json
import base64
import urllib.request
import urllib.error

from nacl import encoding
from nacl.public import PublicKey, SealedBox

TOKEN = "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"
REPO = "ali452158/alfa-expert-option"
API = f"https://api.github.com/repos/{REPO}/actions/secrets"

def get_public_key():
    req = urllib.request.Request(
        f"{API}/public-key",
        headers={
            "Authorization": f"token {TOKEN}",
            "Accept": "application/vnd.github.v3+json"
        }
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
    return data["key"], data["key_id"]

def encrypt_secret(public_key_str, secret_value):
    """Encrypt a secret using the repo's public key"""
    pk = PublicKey(public_key_str.encode("utf-8"), encoding.Base64Encoder())
    sealed_box = SealedBox(pk)
    encrypted = sealed_box.encrypt(secret_value.encode("utf-8"))
    return base64.b64encode(encrypted).decode("utf-8")

def create_secret(name, encrypted_value, key_id):
    data = json.dumps({
        "encrypted_value": encrypted_value,
        "key_id": key_id
    }).encode("utf-8")
    
    req = urllib.request.Request(
        f"{API}/{name}",
        data=data,
        method="PUT",
        headers={
            "Authorization": f"token {TOKEN}",
            "Accept": "application/vnd.github.v3+json",
            "Content-Type": "application/json"
        }
    )
    try:
        with urllib.request.urlopen(req) as resp:
            print(f"  Secret '{name}' created successfully (status: {resp.status})")
    except urllib.error.HTTPError as e:
        print(f"  Secret '{name}' error: {e.code} - {e.read().decode()}")

def main():
    print("Getting repository public key...")
    pub_key, key_id = get_public_key()
    print(f"Key ID: {key_id}")
    
    secrets = {
        "VPS_HOST": "76.13.40.219",
        "VPS_USER": "root",
        "VPS_PASSWORD": "Ali@0164569934",
    }
    
    for name, value in secrets.items():
        print(f"Encrypting and creating secret: {name}")
        encrypted = encrypt_secret(pub_key, value)
        create_secret(name, encrypted, key_id)
    
    print("\nAll secrets added! GitHub Actions will now auto-deploy on push to main.")

if __name__ == "__main__":
    main()

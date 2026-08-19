#!/usr/bin/env python3
"""
Generate 100 activation codes for Alfa Option
Each code:
  - One-time use only
  - Valid for 1 month (30 days) from activation
  - Tied to one device
  - Format: ALFA-XXXX-XXXX (uppercase letters + digits, no confusing chars)
"""
import random
import json
import os
import sys
from datetime import datetime

# Characters: skip confusing ones (0,O,1,I,L)
CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

def random_part(length=4):
    return ''.join(random.choice(CHARS) for _ in range(length))

def generate_code():
    return f"ALFA-{random_part()}-{random_part()}"

def generate_codes(count=100):
    codes = set()
    while len(codes) < count:
        code = generate_code()
        codes.add(code)
    return sorted(codes)

def main():
    count = int(sys.argv[1]) if len(sys.argv) > 1 else 100
    print(f"\n🎯 Generating {count} activation codes...\n")
    print("Code              | Status   | Duration | Device Lock")
    print("─" * 65)

    codes = generate_codes(count)

    # Save as JSON (database format)
    codes_data = []
    for code in codes:
        entry = {
            "code": code,
            "status": "unused",
            "usedBy": None,
            "deviceId": None,
            "deviceInfo": None,
            "activatedAt": None,
            "expiresAt": None,
            "createdAt": datetime.utcnow().isoformat() + "Z",
        }
        codes_data.append(entry)
        print(f"{code} | unused   | 30 days  | yes")

    print("─" * 65)
    print(f"\n✅ Generated {len(codes)} codes successfully!")

    # Save to files in download directory
    os.makedirs('/home/z/my-project/download', exist_ok=True)

    # JSON file (database format)
    json_path = f'/home/z/my-project/download/activation-codes-{int(datetime.utcnow().timestamp())}.json'
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(codes_data, f, ensure_ascii=False, indent=2)
    print(f"📋 JSON file: {json_path}")

    # Text file (codes only)
    txt_path = f'/home/z/my-project/download/activation-codes-{int(datetime.utcnow().timestamp())}.txt'
    with open(txt_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(codes))
    print(f"📋 TXT file: {txt_path}")

    # CSV file (Excel)
    csv_path = f'/home/z/my-project/download/activation-codes-{int(datetime.utcnow().timestamp())}.csv'
    with open(csv_path, 'w', encoding='utf-8') as f:
        f.write('Code,Status,Duration,DeviceLock,CreatedAt\n')
        for c in codes_data:
            f.write(f'{c["code"]},unused,30 days,yes,{c["createdAt"]}\n')
    print(f"📋 CSV file: {csv_path}")

    # Print first 10 codes for preview
    print("\n" + "=" * 65)
    print("📋 Preview (first 10 codes):")
    print("=" * 65)
    for code in codes[:10]:
        print(f"  {code}")
    print(f"\n  ... and {len(codes) - 10} more in the JSON file")
    print("=" * 65)

if __name__ == '__main__':
    main()

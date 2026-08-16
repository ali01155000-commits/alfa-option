#!/bin/bash
cd /home/z/my-project/mini-services/eo-bridge
exec /home/z/.venv/bin/python3 -m uvicorn main:app --host 0.0.0.0 --port 3004 --log-level info

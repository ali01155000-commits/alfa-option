#!/bin/bash
cd /home/z/my-project/mini-services/eo-bridge
exec python3 -c "
import uvicorn
from main import app
uvicorn.run(app, host='0.0.0.0', port=3004, log_level='info')
"

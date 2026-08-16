"""
Expert Option Bridge Server
Connects to Expert Option via ExpertOptionAPI and exposes HTTP API for the Next.js app.
"""
import os
import sys
import json
import time
import threading
import logging
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# ============ Expert Option API ============
try:
    from ExpertOptionAPI.expert import EoApi
    import ExpertOptionAPI.api.global_values as global_value
    EO_AVAILABLE = True
except ImportError:
    EO_AVAILABLE = False
    print("WARNING: ExpertOptionAPI not available, running in simulation mode")

# ============ Logging ============
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("eo-bridge")

# ============ State ============
class AppState:
    def __init__(self):
        self.api = None
        self.connected = False
        self.token = None
        self.is_demo = True
        self.profile_data = None
        self.balance = 0
        self.auto_trading = False
        self.auto_config = {
            "amount": 10,
            "expiryMinutes": 1,
            "strategy": "scalping",
            "maxConcurrentTrades": 3,
            "maxDailyLoss": 50,
            "maxDailyProfit": 100,
            "pair": "EUR/USD",
            "assetId": 240,
        }
        self.open_trades = []
        self.trade_history = []
        self.daily_pnl = 0
        self._lock = threading.Lock()

state = AppState()

# ============ Asset mapping (Expert Option IDs) ============
ASSET_MAP = {
    "EUR/USD": 240, "GBP/USD": 241, "USD/JPY": 242, "AUD/USD": 243,
    "USD/CAD": 244, "EUR/GBP": 245, "EUR/JPY": 246, "GBP/JPY": 247,
    "USD/CHF": 248, "NZD/USD": 249, "USD/TRY": 1, "USD/ZAR": 2,
    "BTC/USD": 3, "ETH/USD": 4,
}
ASSET_MAP_REVERSE = {v: k for k, v in ASSET_MAP.items()}

# ============ FastAPI App ============
app = FastAPI(title="Expert Option Bridge", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============ Models ============
class LoginRequest(BaseModel):
    token: str
    is_demo: bool = True

class TradeRequest(BaseModel):
    pair: str
    direction: str  # "call" or "put"
    amount: int
    expiryMinutes: int = 1

class AutoConfigRequest(BaseModel):
    enabled: Optional[bool] = None
    amount: Optional[int] = None
    expiryMinutes: Optional[int] = None
    strategy: Optional[str] = None
    maxConcurrentTrades: Optional[int] = None
    maxDailyLoss: Optional[int] = None
    maxDailyProfit: Optional[int] = None
    pair: Optional[str] = None

# ============ API Endpoints ============

@app.get("/api/status")
def get_status():
    """Check if connected to Expert Option"""
    return {
        "connected": state.connected,
        "is_demo": state.is_demo,
        "balance": state.balance,
        "autoTrading": state.auto_trading,
        "dailyPnl": state.daily_pnl,
        "openTrades": len(state.open_trades),
        "eoAvailable": EO_AVAILABLE,
    }

@app.post("/api/login")
def login(req: LoginRequest):
    """Connect to Expert Option with SSID token"""
    if not EO_AVAILABLE:
        raise HTTPException(status_code=500, detail="ExpertOptionAPI not installed")

    try:
        # Disconnect existing connection
        if state.api and state.connected:
            try:
                state.api.websocket_client.wss.close()
            except:
                pass

        logger.info(f"Connecting to Expert Option with token: {req.token[:10]}...")
        
        # Create API instance and connect
        api = EoApi(token=req.token, server_region="wss://fr24g1eu.expertoption.com/")
        result = api.connect()
        
        if result is False:
            raise HTTPException(status_code=401, detail="Connection failed - invalid token")
        
        state.api = api
        state.token = req.token
        state.connected = True
        state.is_demo = req.is_demo

        # Set demo/real mode
        if req.is_demo:
            api.SetDemo()

        # Get profile
        time.sleep(3)  # Wait for data to arrive
        profile = api.Profile()
        state.profile_data = profile
        
        # Extract balance from profile
        try:
            if isinstance(profile, dict):
                state.balance = float(profile.get("balance", 0))
            elif profile:
                state.balance = 10000 if req.is_demo else 0
        except:
            state.balance = 10000 if req.is_demo else 0

        logger.info(f"Connected! Balance: {state.balance}, Demo: {req.is_demo}")

        return {
            "success": True,
            "balance": state.balance,
            "is_demo": req.is_demo,
            "profile": str(profile)[:500] if profile else None,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        state.connected = False
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/logout")
def logout():
    """Disconnect from Expert Option"""
    if state.api and state.connected:
        try:
            state.api.websocket_client.wss.close()
        except:
            pass
    
    state.api = None
    state.connected = False
    state.token = None
    state.balance = 0
    state.auto_trading = False
    state.profile_data = None
    return {"success": True}

@app.get("/api/profile")
def get_profile():
    """Get current profile/balance"""
    if not state.connected or not state.api:
        raise HTTPException(status_code=400, detail="Not connected")
    
    try:
        profile = state.api.Profile()
        state.profile_data = profile
        
        try:
            if isinstance(profile, dict):
                state.balance = float(profile.get("balance", 0))
        except:
            pass
            
        return {
            "balance": state.balance,
            "is_demo": state.is_demo,
            "profile": str(profile)[:500] if profile else None,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/trade")
def place_trade(req: TradeRequest):
    """Place a trade on Expert Option"""
    if not state.connected or not state.api:
        raise HTTPException(status_code=400, detail="Not connected to Expert Option")

    if req.amount < 1 or req.amount > 100:
        raise HTTPException(status_code=400, detail="Amount must be between $1 and $100")

    asset_id = ASSET_MAP.get(req.pair, 240)
    direction = "call" if req.direction in ("buy", "call") else "put"
    is_demo = 1 if state.is_demo else 0
    expiry_seconds = req.expiryMinutes * 60

    try:
        result = state.api.Buy(
            amount=req.amount,
            type=direction,
            assetid=asset_id,
            exptime=expiry_seconds,
            isdemo=is_demo,
            strike_time=int(time.time())
        )

        trade_record = {
            "id": f"eo_{int(time.time())}_{direction}",
            "pair": req.pair,
            "direction": "buy" if direction == "call" else "sell",
            "amount": req.amount,
            "assetId": asset_id,
            "expiryMinutes": req.expiryMinutes,
            "timestamp": int(time.time() * 1000),
            "result": str(result)[:300] if result else None,
        }
        
        with state._lock:
            state.open_trades.append(trade_record)

        logger.info(f"Trade placed: {direction.upper()} ${req.amount} on {req.pair}")
        
        return {
            "success": True,
            "trade": trade_record,
        }

    except Exception as e:
        logger.error(f"Trade error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/trades")
def get_trades():
    """Get open trades and history"""
    return {
        "openTrades": state.open_trades,
        "history": state.trade_history[-50:],
        "dailyPnl": state.daily_pnl,
    }

@app.post("/api/auto-config")
def update_auto_config(req: AutoConfigRequest):
    """Update auto-trading configuration"""
    with state._lock:
        if req.enabled is not None:
            state.auto_trading = req.enabled
        if req.amount is not None:
            state.auto_config["amount"] = max(1, min(100, req.amount))
        if req.expiryMinutes is not None:
            state.auto_config["expiryMinutes"] = req.expiryMinutes
        if req.strategy is not None:
            state.auto_config["strategy"] = req.strategy
        if req.maxConcurrentTrades is not None:
            state.auto_config["maxConcurrentTrades"] = req.maxConcurrentTrades
        if req.maxDailyLoss is not None:
            state.auto_config["maxDailyLoss"] = req.maxDailyLoss
        if req.maxDailyProfit is not None:
            state.auto_config["maxDailyProfit"] = req.maxDailyProfit
        if req.pair is not None:
            state.auto_config["pair"] = req.pair
            state.auto_config["assetId"] = ASSET_MAP.get(req.pair, 240)

    return {
        "autoTrading": state.auto_trading,
        "config": state.auto_config,
    }

@app.get("/api/auto-status")
def get_auto_status():
    """Get auto-trading status"""
    return {
        "enabled": state.auto_trading,
        "config": state.auto_config,
        "dailyPnl": state.daily_pnl,
        "openTrades": len(state.open_trades),
    }

# ============ Auto-Trading Engine ============
def auto_trading_loop():
    """Background thread for auto-trading"""
    logger.info("Auto-trading thread started")
    
    while True:
        if not state.auto_trading or not state.connected:
            time.sleep(2)
            continue

        # Risk checks
        if state.daily_pnl <= -state.auto_config["maxDailyLoss"]:
            logger.warning("Max daily loss reached, pausing auto-trading")
            time.sleep(30)
            continue

        if state.daily_pnl >= state.auto_config["maxDailyProfit"]:
            logger.info("Max daily profit reached, pausing auto-trading")
            time.sleep(30)
            continue

        if len(state.open_trades) >= state.auto_config["maxConcurrentTrades"]:
            time.sleep(5)
            continue

        try:
            # Simple scalping strategy: random direction (placeholder for real strategies)
            import random
            direction = "call" if random.random() > 0.5 else "put"
            
            result = state.api.Buy(
                amount=state.auto_config["amount"],
                type=direction,
                assetid=state.auto_config["assetId"],
                exptime=state.auto_config["expiryMinutes"] * 60,
                isdemo=1 if state.is_demo else 0,
                strike_time=int(time.time())
            )
            
            trade_record = {
                "id": f"auto_{int(time.time())}_{direction}",
                "pair": state.auto_config["pair"],
                "direction": "buy" if direction == "call" else "sell",
                "amount": state.auto_config["amount"],
                "assetId": state.auto_config["assetId"],
                "expiryMinutes": state.auto_config["expiryMinutes"],
                "timestamp": int(time.time() * 1000),
                "strategy": state.auto_config["strategy"],
                "result": str(result)[:300] if result else None,
            }
            
            with state._lock:
                state.open_trades.append(trade_record)
            
            logger.info(f"Auto-trade: {direction.upper()} ${state.auto_config['amount']} on {state.auto_config['pair']}")

        except Exception as e:
            logger.error(f"Auto-trade error: {e}")

        # Wait between trades
        time.sleep(state.auto_config["expiryMinutes"] * 60 + 5)

# Start auto-trading thread
auto_thread = threading.Thread(target=auto_trading_loop, daemon=True)
auto_thread.start()

# ============ Main ============
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 3004))
    logger.info(f"Starting Expert Option Bridge on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")

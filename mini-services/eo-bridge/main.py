"""
Expert Option Bridge Server v2.0
- FastAPI HTTP endpoints for login, trade, config
- FastAPI native WebSocket for real-time price streaming & trade updates
- Real auto-trading strategies (MA Cross, RSI, MACD, Scalping, Trend Follow)
- Connects to Expert Option via ExpertOptionAPI
"""
import os
import sys
import json
import time
import math
import threading
import logging
import asyncio
from typing import Optional, Dict, List, Any, Set
from collections import deque
from datetime import datetime

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# ============ Expert Option API ============
try:
    from ExpertOptionAPI.expert import EoApi
    import ExpertOptionAPI.api.global_values as global_value
    EO_AVAILABLE = True
    print("✅ ExpertOptionAPI loaded successfully")
except ImportError:
    EO_AVAILABLE = False
    print("⚠️ ExpertOptionAPI not available, running in simulation mode")

# ============ Logging ============
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger("eo-bridge")

# ============ Asset Mapping ============
ASSET_MAP = {
    "EUR/USD": 240, "GBP/USD": 241, "USD/JPY": 242, "AUD/USD": 243,
    "USD/CAD": 244, "EUR/GBP": 245, "EUR/JPY": 246, "GBP/JPY": 247,
    "USD/CHF": 248, "NZD/USD": 249, "EUR/AUD": 250, "GBP/CAD": 251,
    "EUR/CHF": 252, "AUD/JPY": 253, "USD/TRY": 1, "USD/ZAR": 2,
    "USD/SGD": 5, "USD/HKD": 6, "EUR/TRY": 7,
    "BTC/USD": 3, "ETH/USD": 4,
}
ASSET_MAP_REVERSE = {v: k for k, v in ASSET_MAP.items()}

# ============ Strategy Implementations ============
class BaseStrategy:
    def __init__(self, name: str):
        self.name = name
        self.price_history: deque = deque(maxlen=200)
        self.last_signal: Optional[str] = None

    def add_price(self, price: float, timestamp: float = None):
        self.price_history.append({'price': price, 'time': timestamp or time.time()})

    def get_signal(self) -> Optional[str]:
        return None

    def reset(self):
        self.price_history.clear()
        self.last_signal = None


class MACrossStrategy(BaseStrategy):
    def __init__(self, fast_period=5, slow_period=20):
        super().__init__("ma_cross")
        self.fast_period = fast_period
        self.slow_period = slow_period

    def get_signal(self) -> Optional[str]:
        if len(self.price_history) < self.slow_period + 2:
            return None
        prices = [p['price'] for p in self.price_history]
        fast_ma = sum(prices[-self.fast_period:]) / self.fast_period
        slow_ma = sum(prices[-self.slow_period:]) / self.slow_period
        prev_fast = sum(prices[-self.fast_period-1:-1]) / self.fast_period
        prev_slow = sum(prices[-self.slow_period-1:-1]) / self.slow_period
        if prev_fast <= prev_slow and fast_ma > slow_ma:
            return 'call'
        elif prev_fast >= prev_slow and fast_ma < slow_ma:
            return 'put'
        return None


class RSIStrategy(BaseStrategy):
    def __init__(self, period=14, overbought=70, oversold=30):
        super().__init__("rsi")
        self.period = period
        self.overbought = overbought
        self.oversold = oversold

    def get_signal(self) -> Optional[str]:
        if len(self.price_history) < self.period + 1:
            return None
        prices = [p['price'] for p in self.price_history]
        deltas = [prices[i] - prices[i-1] for i in range(1, len(prices))]
        recent = deltas[-(self.period):]
        gains = [d if d > 0 else 0 for d in recent]
        losses = [-d if d < 0 else 0 for d in recent]
        avg_gain = sum(gains) / self.period
        avg_loss = sum(losses) / self.period
        if avg_loss == 0:
            rsi = 100
        else:
            rs = avg_gain / avg_loss
            rsi = 100 - (100 / (1 + rs))
        if rsi < self.oversold:
            return 'call'
        elif rsi > self.overbought:
            return 'put'
        return None


class MACDStrategy(BaseStrategy):
    def __init__(self, fast=12, slow=26, signal=9):
        super().__init__("macd")
        self.fast = fast
        self.slow = slow
        self.signal = signal

    def _ema(self, data: List[float], period: int) -> List[float]:
        if len(data) < period:
            return []
        multiplier = 2 / (period + 1)
        ema = [sum(data[:period]) / period]
        for price in data[period:]:
            ema.append((price - ema[-1]) * multiplier + ema[-1])
        return ema

    def get_signal(self) -> Optional[str]:
        if len(self.price_history) < self.slow + self.signal + 2:
            return None
        prices = [p['price'] for p in self.price_history]
        fast_ema = self._ema(prices, self.fast)
        slow_ema = self._ema(prices, self.slow)
        min_len = min(len(fast_ema), len(slow_ema))
        if min_len < 3:
            return None
        macd_line = [f - s for f, s in zip(fast_ema[-min_len:], slow_ema[-min_len:])]
        signal_line = self._ema(macd_line, self.signal)
        if len(signal_line) < 2 or len(macd_line) < 2:
            return None
        curr_macd = macd_line[-1]
        curr_signal = signal_line[-1]
        prev_macd = macd_line[-2]
        prev_signal = signal_line[-2]
        if prev_macd <= prev_signal and curr_macd > curr_signal:
            return 'call'
        elif prev_macd >= prev_signal and curr_macd < curr_signal:
            return 'put'
        return None


class ScalpingStrategy(BaseStrategy):
    def __init__(self):
        super().__init__("scalping")

    def get_signal(self) -> Optional[str]:
        if len(self.price_history) < 5:
            return None
        prices = [p['price'] for p in self.price_history]
        last3 = prices[-3:]
        if all(last3[i] > last3[i-1] for i in range(1, 3)):
            if prices[-1] - prices[-3] < (prices[-3] * 0.0003):
                return 'call'
        if all(last3[i] < last3[i-1] for i in range(1, 3)):
            if prices[-3] - prices[-1] < (prices[-3] * 0.0003):
                return 'put'
        if prices[-2] > prices[-3] and prices[-1] < prices[-2]:
            return 'put'
        if prices[-2] < prices[-3] and prices[-1] > prices[-2]:
            return 'call'
        return None


class TrendFollowStrategy(BaseStrategy):
    def __init__(self, ma_period=10, threshold=0.0002):
        super().__init__("trend_follow")
        self.ma_period = ma_period
        self.threshold = threshold

    def get_signal(self) -> Optional[str]:
        if len(self.price_history) < self.ma_period + 1:
            return None
        prices = [p['price'] for p in self.price_history]
        ma = sum(prices[-self.ma_period:]) / self.ma_period
        current = prices[-1]
        deviation = (current - ma) / ma
        if deviation > self.threshold:
            return 'call'
        elif deviation < -self.threshold:
            return 'put'
        return None


STRATEGIES = {
    "ma_cross": MACrossStrategy,
    "rsi": RSIStrategy,
    "macd": MACDStrategy,
    "scalping": ScalpingStrategy,
    "trend_follow": TrendFollowStrategy,
}

# ============ App State ============
class AppState:
    def __init__(self):
        self.api = None
        self.connected = False
        self.token = None
        self.is_demo = True
        self.profile_data = None
        self.balance = 0.0
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
        self.open_trades: List[Dict] = []
        self.trade_history: List[Dict] = []
        self.daily_pnl = 0.0
        self.daily_start = time.time()
        self.active_strategy: Optional[BaseStrategy] = None
        self.price_cache: Dict[str, float] = {}
        self._lock = threading.Lock()
        self.ws_clients: Set[Any] = set()  # WebSocket clients for broadcasting
        self._ws_lock = threading.Lock()

    def reset_day(self):
        now = datetime.now()
        if now.hour == 0 and now.minute == 0:
            self.daily_pnl = 0
            self.daily_start = time.time()

    def init_strategy(self, strategy_name: str):
        if strategy_name in STRATEGIES:
            self.active_strategy = STRATEGIES[strategy_name]()
            logger.info(f"Strategy initialized: {strategy_name}")
        else:
            self.active_strategy = ScalpingStrategy()

    def add_ws_client(self, ws):
        with self._ws_lock:
            self.ws_clients.add(ws)

    def remove_ws_client(self, ws):
        with self._ws_lock:
            self.ws_clients.discard(ws)

state = AppState()

# ============ FastAPI App ============
app = FastAPI(title="Expert Option Bridge v2.0", version="2.0")

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

class EmailLoginRequest(BaseModel):
    email: str
    password: str
    is_demo: bool = True

class TradeRequest(BaseModel):
    pair: str
    direction: str
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


# ============ WebSocket Endpoint ============
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    state.add_ws_client(websocket)
    logger.info(f"WebSocket client connected. Total: {len(state.ws_clients)}")

    try:
        while True:
            # Receive messages from client
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                msg_type = msg.get("type")

                if msg_type == "subscribe":
                    logger.info(f"Client subscribed to price updates")
                elif msg_type == "ping":
                    await websocket.send_json({"type": "pong"})

            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        state.remove_ws_client(websocket)
        logger.info(f"WebSocket client disconnected. Total: {len(state.ws_clients)}")
    except Exception as e:
        state.remove_ws_client(websocket)
        logger.debug(f"WebSocket error: {e}")


async def broadcast_to_clients(event_type: str, data: Dict):
    """Broadcast event to all WebSocket clients"""
    with state._ws_lock:
        clients = list(state.ws_clients)

    message = json.dumps({"type": event_type, **data})
    for client in clients:
        try:
            await client.send_text(message)
        except:
            state.remove_ws_client(client)


# ============ Price Polling Thread ============
def price_polling_loop():
    """Poll Expert Option for real-time prices"""
    logger.info("Price polling thread started")

    SIM_PRICES = {
        "EUR/USD": 1.0850, "GBP/USD": 1.2650, "USD/JPY": 149.50,
        "AUD/USD": 0.6520, "USD/CAD": 1.3650, "EUR/GBP": 0.8580,
        "EUR/JPY": 162.25, "GBP/JPY": 189.10, "USD/CHF": 0.8820,
        "NZD/USD": 0.5980, "BTC/USD": 43500.0, "ETH/USD": 2350.0,
    }

    import random
    tick = 0

    while True:
        tick += 1

        if state.connected and state.api and EO_AVAILABLE:
            try:
                # Try to get real prices from Expert Option global_values
                if hasattr(global_value, 'subscriptions') and global_value.subscriptions:
                    for asset_id, sub_data in global_value.subscriptions.items():
                        pair_name = ASSET_MAP_REVERSE.get(asset_id, f"ID:{asset_id}")
                        if isinstance(sub_data, dict) and 'price' in sub_data:
                            price = float(sub_data['price'])
                            state.price_cache[pair_name] = price
                        elif isinstance(sub_data, (int, float)):
                            state.price_cache[pair_name] = float(sub_data)
            except Exception as e:
                logger.debug(f"Price polling error: {e}")

            # Balance update every 10 seconds
            if tick % 10 == 0:
                try:
                    profile = state.api.Profile()
                    if isinstance(profile, dict):
                        new_balance = float(profile.get('balance', state.balance))
                        if new_balance != state.balance:
                            state.balance = new_balance
                except:
                    pass

        # Simulate prices if no real data
        if not state.connected or not state.price_cache:
            for pair, base in SIM_PRICES.items():
                change = random.gauss(0, base * 0.00005)
                SIM_PRICES[pair] = round(base + change, 5 if base < 10 else 2 if base > 100 else 4)
                state.price_cache[pair] = SIM_PRICES[pair]

        time.sleep(1)


# ============ Auto-Trading Engine ============
def auto_trading_loop():
    logger.info("Auto-trading thread started")
    state.init_strategy(state.auto_config.get("strategy", "scalping"))

    while True:
        if not state.auto_trading or not state.connected:
            time.sleep(2)
            continue

        state.reset_day()

        with state._lock:
            config = state.auto_config.copy()
            daily_pnl = state.daily_pnl
            open_count = len(state.open_trades)

        if daily_pnl <= -config["maxDailyLoss"]:
            logger.warning(f"⛔ Max daily loss: ${daily_pnl:.2f} / -${config['maxDailyLoss']}")
            time.sleep(30)
            continue

        if daily_pnl >= config["maxDailyProfit"]:
            logger.info(f"🎯 Max daily profit: ${daily_pnl:.2f} / ${config['maxDailyProfit']}")
            time.sleep(30)
            continue

        if open_count >= config["maxConcurrentTrades"]:
            time.sleep(5)
            continue

        pair = config["pair"]
        current_price = state.price_cache.get(pair)
        if not current_price:
            time.sleep(2)
            continue

        if state.active_strategy:
            state.active_strategy.add_price(current_price)
            signal = state.active_strategy.get_signal()

            if signal:
                direction = signal
                asset_id = ASSET_MAP.get(pair, 240)
                is_demo = 1 if state.is_demo else 0
                expiry_seconds = config["expiryMinutes"] * 60

                logger.info(f"📊 Signal: {signal.upper()} on {pair} @ {current_price}")

                try:
                    if EO_AVAILABLE and state.api:
                        result = state.api.Buy(
                            amount=config["amount"],
                            type=direction,
                            assetid=asset_id,
                            exptime=expiry_seconds,
                            isdemo=is_demo,
                            strike_time=int(time.time())
                        )
                        logger.info(f"✅ Trade: {direction.upper()} ${config['amount']} on {pair}")
                    else:
                        result = "simulated"
                        logger.info(f"📝 Sim trade: {direction.upper()} ${config['amount']} on {pair}")

                    trade_record = {
                        "id": f"auto_{int(time.time())}_{direction}",
                        "pair": pair,
                        "direction": "buy" if direction == "call" else "sell",
                        "callPut": direction,
                        "amount": config["amount"],
                        "assetId": asset_id,
                        "expiryMinutes": config["expiryMinutes"],
                        "entryPrice": current_price,
                        "strategy": config["strategy"],
                        "timestamp": int(time.time() * 1000),
                        "isDemo": state.is_demo,
                        "result": str(result)[:300] if result else None,
                    }

                    with state._lock:
                        state.open_trades.append(trade_record)

                    state.active_strategy.last_signal = signal

                except Exception as e:
                    logger.error(f"❌ Auto-trade error: {e}")

        wait_time = min(config["expiryMinutes"] * 60 + 3, 30)
        time.sleep(wait_time)


# ============ Trade Expiry Checker ============
def trade_expiry_loop():
    logger.info("Trade expiry checker started")

    while True:
        if not state.open_trades:
            time.sleep(5)
            continue

        now = time.time() * 1000
        expired_trades = []

        with state._lock:
            for trade in state.open_trades[:]:
                expiry_ms = trade.get("expiryMinutes", 1) * 60 * 1000
                trade_age = now - trade.get("timestamp", now)
                if trade_age >= expiry_ms:
                    expired_trades.append(trade)
                    state.open_trades.remove(trade)

        for trade in expired_trades:
            entry_price = trade.get("entryPrice", 0)
            pair = trade.get("pair", "")
            current_price = state.price_cache.get(pair, entry_price)
            direction = trade.get("callPut", trade.get("direction", "call"))
            amount = trade.get("amount", 0)
            payout_pct = 80

            if direction == "call":
                won = current_price > entry_price
            else:
                won = current_price < entry_price

            pnl = amount * (payout_pct / 100) if won else -amount

            closed_trade = {
                **trade,
                "exitPrice": current_price,
                "pnl": pnl,
                "won": won,
                "payoutPercent": payout_pct,
                "closeTimestamp": int(now),
            }

            with state._lock:
                state.trade_history.append(closed_trade)
                state.daily_pnl += pnl

            emoji = "🟢" if won else "🔴"
            logger.info(f"{emoji} Trade: {direction.upper()} ${amount} on {pair} - {'WON' if won else 'LOST'} ${abs(pnl):.2f}")

        time.sleep(5)


# ============ Auto-Login with Playwright ============
def auto_login_expertoption(email: str, password: str) -> Optional[str]:
    """
    Automatically login to Expert Option using Playwright headless browser.
    Returns the SSID token if successful, None if failed.
    """
    try:
        from playwright.sync_api import sync_playwright
        PLAYWRIGHT_AVAILABLE = True
    except ImportError:
        PLAYWRIGHT_AVAILABLE = False
        logger.error("Playwright not available for auto-login")
        return None

    ssid_token = None
    logger.info(f"🌐 Auto-login: Opening Expert Option for {email[:5]}...")

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            )
            context = browser.new_context(
                viewport={'width': 1280, 'height': 720},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
            page = context.new_page()

            # Go to Expert Option login page
            logger.info("🌐 Navigating to Expert Option login page...")
            page.goto('https://expertoption.com/login', wait_until='domcontentloaded', timeout=30000)
            page.wait_for_timeout(2000)

            # Try to find and fill the email field
            # Expert Option uses various selectors - try multiple
            email_filled = False
            password_filled = False

            # Attempt 1: Common input selectors
            email_selectors = [
                'input[type="email"]',
                'input[name="email"]',
                'input[id="email"]',
                'input[placeholder*="email" i]',
                'input[placeholder*="Email" i]',
                'input.form-input:first-of-type',
                'input[type="text"]:first-of-type',
            ]

            for selector in email_selectors:
                try:
                    el = page.query_selector(selector)
                    if el and el.is_visible():
                        el.click()
                        el.fill(email)
                        email_filled = True
                        logger.info(f"✅ Email filled with selector: {selector}")
                        break
                except:
                    continue

            if not email_filled:
                # Try to find any visible input and use the first one for email
                try:
                    inputs = page.query_selector_all('input:not([type="hidden"]):not([type="checkbox"])')
                    visible_inputs = [i for i in inputs if i.is_visible()]
                    if len(visible_inputs) >= 1:
                        visible_inputs[0].click()
                        visible_inputs[0].fill(email)
                        email_filled = True
                        logger.info("✅ Email filled (fallback method)")
                except Exception as e:
                    logger.error(f"Could not find email input: {e}")

            page.wait_for_timeout(500)

            # Fill password
            password_selectors = [
                'input[type="password"]',
                'input[name="password"]',
                'input[id="password"]',
                'input[placeholder*="password" i]',
                'input[placeholder*="Password" i]',
            ]

            for selector in password_selectors:
                try:
                    el = page.query_selector(selector)
                    if el and el.is_visible():
                        el.click()
                        el.fill(password)
                        password_filled = True
                        logger.info(f"✅ Password filled with selector: {selector}")
                        break
                except:
                    continue

            if not password_filled:
                try:
                    inputs = page.query_selector_all('input[type="password"]')
                    visible_pwd = [i for i in inputs if i.is_visible()]
                    if visible_pwd:
                        visible_pwd[0].click()
                        visible_pwd[0].fill(password)
                        password_filled = True
                        logger.info("✅ Password filled (fallback)")
                except Exception as e:
                    logger.error(f"Could not find password input: {e}")

            if not email_filled or not password_filled:
                logger.error(f"❌ Could not fill form. Email: {email_filled}, Password: {password_filled}")
                # Take screenshot for debugging
                try:
                    page.screenshot(path='/tmp/eo-login-debug.png')
                    logger.info("📸 Debug screenshot saved to /tmp/eo-login-debug.png")
                except:
                    pass
                browser.close()
                return None

            # Click login button
            page.wait_for_timeout(500)

            login_selectors = [
                'button[type="submit"]',
                'button:has-text("Log In")',
                'button:has-text("Login")',
                'button:has-text("Sign In")',
                'button:has-text("تسجيل")',
                'input[type="submit"]',
                '.login-btn',
                'button.btn-primary',
            ]

            login_clicked = False
            for selector in login_selectors:
                try:
                    el = page.query_selector(selector)
                    if el and el.is_visible():
                        el.click()
                        login_clicked = True
                        logger.info(f"✅ Login button clicked: {selector}")
                        break
                except:
                    continue

            if not login_clicked:
                # Try pressing Enter
                try:
                    page.keyboard.press('Enter')
                    login_clicked = True
                    logger.info("✅ Login submitted with Enter key")
                except:
                    pass

            if not login_clicked:
                logger.error("❌ Could not find login button")
                browser.close()
                return None

            # Wait for login to complete (page navigation or cookie set)
            logger.info("⏳ Waiting for login to complete...")
            try:
                # Wait for either URL change or cookie appearance
                for _ in range(30):  # 30 seconds max
                    page.wait_for_timeout(1000)

                    # Check cookies for SSID
                    cookies = context.cookies()
                    for cookie in cookies:
                        if cookie.get('name') == 'ssid' and cookie.get('value'):
                            ssid_token = cookie['value']
                            logger.info(f"✅ SSID token found! Length: {len(ssid_token)}")
                            break

                    if ssid_token:
                        break

                    # Also check if we got redirected to the main app
                    current_url = page.url
                    if 'app.expertoption.com' in current_url or ('expertoption.com' in current_url and '/login' not in current_url):
                        logger.info(f"✅ Redirected to: {current_url}")
                        # Check cookies again after redirect
                        cookies = context.cookies()
                        for cookie in cookies:
                            if cookie.get('name') == 'ssid' and cookie.get('value'):
                                ssid_token = cookie['value']
                                logger.info(f"✅ SSID token found after redirect! Length: {len(ssid_token)}")
                                break
                        if ssid_token:
                            break

            except Exception as e:
                logger.error(f"Login wait error: {e}")

            browser.close()

    except Exception as e:
        logger.error(f"❌ Auto-login error: {e}")
        return None

    if ssid_token:
        logger.info(f"🎉 Auto-login successful! Token: {ssid_token[:10]}...")
    else:
        logger.warning("⚠️ Auto-login: Could not obtain SSID token")

    return ssid_token


# ============ API Endpoints ============
@app.get("/api/status")
def get_status():
    return {
        "connected": state.connected,
        "is_demo": state.is_demo,
        "balance": state.balance,
        "autoTrading": state.auto_trading,
        "dailyPnl": state.daily_pnl,
        "openTrades": len(state.open_trades),
        "eoAvailable": EO_AVAILABLE,
        "strategy": state.auto_config.get("strategy", "none"),
        "activeStrategy": state.active_strategy.name if state.active_strategy else None,
        "pricesCached": len(state.price_cache),
        "wsClients": len(state.ws_clients),
        "playwrightAvailable": True,  # Playwright is installed
    }


@app.post("/api/login-email")
def login_with_email(req: EmailLoginRequest):
    """
    Login to Expert Option using email & password.
    Uses Playwright headless browser to automate the login process
    and extract the SSID token from cookies.
    """
    import concurrent.futures
    
    if not req.email or not req.password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    logger.info(f"📧 Auto-login request for: {req.email[:5]}***@{req.email.split('@')[-1] if '@' in req.email else '...'}")

    # Run Playwright in a thread pool (it's synchronous)
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(auto_login_expertoption, req.email, req.password)
        try:
            ssid_token = future.result(timeout=60)  # 60 second timeout
        except concurrent.futures.TimeoutError:
            raise HTTPException(status_code=408, detail="Login timed out - took more than 60 seconds")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Auto-login error: {str(e)}")

    if not ssid_token:
        raise HTTPException(
            status_code=401, 
            detail="Auto-login failed - could not obtain SSID token. Check your email/password or try the manual token method."
        )

    # Now connect with the obtained token
    if not EO_AVAILABLE:
        raise HTTPException(status_code=500, detail="ExpertOptionAPI not installed")

    try:
        # Disconnect existing connection
        if state.api and state.connected:
            try:
                state.api.websocket_client.wss.close()
            except:
                pass

        logger.info(f"🔐 Connecting with auto-obtained token: {ssid_token[:10]}...")

        api = EoApi(token=ssid_token, server_region="wss://fr24g1eu.expertoption.com/")
        result = api.connect()

        if result is False:
            raise HTTPException(status_code=401, detail="Connection failed with auto-obtained token")

        state.api = api
        state.token = ssid_token
        state.connected = True
        state.is_demo = req.is_demo

        if req.is_demo:
            try:
                api.SetDemo()
                logger.info("🎮 Demo mode activated")
            except:
                pass

        # Get profile
        time.sleep(3)
        try:
            profile = api.Profile()
            state.profile_data = profile
            if isinstance(profile, dict):
                state.balance = float(profile.get("balance", 0))
            elif isinstance(profile, (int, float)):
                state.balance = float(profile)
            else:
                try:
                    if hasattr(global_value, 'balance'):
                        state.balance = float(global_value.balance)
                except:
                    state.balance = 10000 if req.is_demo else 0
        except Exception as e:
            logger.warning(f"Profile fetch error: {e}")
            state.balance = 10000 if req.is_demo else 0

        logger.info(f"✅ Auto-login successful! Balance: ${state.balance:.2f}")

        return {
            "success": True,
            "balance": state.balance,
            "is_demo": req.is_demo,
            "autoLogin": True,
            "tokenLength": len(ssid_token),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Auto-login connection error: {e}")
        state.connected = False
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/login")
def login(req: LoginRequest):
    if not EO_AVAILABLE:
        raise HTTPException(status_code=500, detail="ExpertOptionAPI not installed. Install with: pip install ExpertOptionAPI")

    try:
        if state.api and state.connected:
            try:
                state.api.websocket_client.wss.close()
            except:
                pass

        logger.info(f"🔐 Connecting to Expert Option with token: {req.token[:15]}...")

        api = EoApi(token=req.token, server_region="wss://fr24g1eu.expertoption.com/")
        result = api.connect()

        if result is False:
            raise HTTPException(status_code=401, detail="Connection failed - invalid or expired token")

        state.api = api
        state.token = req.token
        state.connected = True
        state.is_demo = req.is_demo

        if req.is_demo:
            try:
                api.SetDemo()
                logger.info("🎮 Demo mode activated")
            except Exception as e:
                logger.warning(f"SetDemo error: {e}")

        time.sleep(3)
        try:
            profile = api.Profile()
            state.profile_data = profile
            if isinstance(profile, dict):
                state.balance = float(profile.get("balance", 0))
            elif isinstance(profile, (int, float)):
                state.balance = float(profile)
            else:
                try:
                    if hasattr(global_value, 'balance'):
                        state.balance = float(global_value.balance)
                except:
                    state.balance = 10000 if req.is_demo else 0
        except Exception as e:
            logger.warning(f"Profile fetch error: {e}")
            state.balance = 10000 if req.is_demo else 0

        logger.info(f"✅ Connected! Balance: ${state.balance:.2f}, Demo: {req.is_demo}")

        return {
            "success": True,
            "balance": state.balance,
            "is_demo": req.is_demo,
            "profile": str(state.profile_data)[:500] if state.profile_data else None,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Login error: {e}")
        state.connected = False
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/logout")
def logout():
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
    state.price_cache.clear()
    state.open_trades.clear()

    logger.info("👋 Disconnected from Expert Option")
    return {"success": True}


@app.get("/api/profile")
def get_profile():
    if not state.connected or not state.api:
        raise HTTPException(status_code=400, detail="Not connected")

    try:
        profile = state.api.Profile()
        state.profile_data = profile
        if isinstance(profile, dict):
            state.balance = float(profile.get("balance", state.balance))
        elif isinstance(profile, (int, float)):
            state.balance = float(profile)

        return {
            "balance": state.balance,
            "is_demo": state.is_demo,
            "profile": str(profile)[:500] if profile else None,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/trade")
def place_trade(req: TradeRequest):
    if not state.connected:
        raise HTTPException(status_code=400, detail="Not connected to Expert Option")

    if req.amount < 1 or req.amount > 100:
        raise HTTPException(status_code=400, detail="Amount must be between $1 and $100")

    asset_id = ASSET_MAP.get(req.pair, 240)
    direction = "call" if req.direction in ("buy", "call") else "put"
    is_demo = 1 if state.is_demo else 0
    expiry_seconds = req.expiryMinutes * 60
    current_price = state.price_cache.get(req.pair, 0)

    try:
        if EO_AVAILABLE and state.api:
            result = state.api.Buy(
                amount=req.amount,
                type=direction,
                assetid=asset_id,
                exptime=expiry_seconds,
                isdemo=is_demo,
                strike_time=int(time.time())
            )
        else:
            result = "simulated"

        trade_record = {
            "id": f"manual_{int(time.time())}_{direction}",
            "pair": req.pair,
            "direction": "buy" if direction == "call" else "sell",
            "callPut": direction,
            "amount": req.amount,
            "assetId": asset_id,
            "expiryMinutes": req.expiryMinutes,
            "entryPrice": current_price,
            "timestamp": int(time.time() * 1000),
            "isDemo": state.is_demo,
            "manual": True,
            "result": str(result)[:300] if result else None,
        }

        with state._lock:
            state.open_trades.append(trade_record)

        logger.info(f"✅ Manual trade: {direction.upper()} ${req.amount} on {req.pair}")

        return {"success": True, "trade": trade_record}

    except Exception as e:
        logger.error(f"❌ Trade error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/trades")
def get_trades():
    return {
        "openTrades": state.open_trades,
        "history": state.trade_history[-50:],
        "dailyPnl": state.daily_pnl,
    }


@app.post("/api/auto-config")
def update_auto_config(req: AutoConfigRequest):
    with state._lock:
        if req.enabled is not None:
            state.auto_trading = req.enabled
            logger.info(f"🤖 Auto-trading {'ENABLED' if req.enabled else 'DISABLED'}")
        if req.amount is not None:
            state.auto_config["amount"] = max(1, min(100, req.amount))
        if req.expiryMinutes is not None:
            state.auto_config["expiryMinutes"] = req.expiryMinutes
        if req.strategy is not None:
            state.auto_config["strategy"] = req.strategy
            state.init_strategy(req.strategy)
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
    return {
        "enabled": state.auto_trading,
        "config": state.auto_config,
        "dailyPnl": state.daily_pnl,
        "openTrades": len(state.open_trades),
        "strategy": state.active_strategy.name if state.active_strategy else None,
    }


@app.get("/api/strategies")
def get_strategies():
    return {
        "strategies": [
            {"id": "ma_cross", "name": "MA Crossover", "description": "تقاطع المتوسطات المتحركة"},
            {"id": "rsi", "name": "RSI", "description": "مؤشر القوة النسبية"},
            {"id": "macd", "name": "MACD", "description": "تقاطع MACD مع خط الإشارة"},
            {"id": "scalping", "name": "Scalping", "description": "سكالبينج سريع"},
            {"id": "trend_follow", "name": "Trend Following", "description": "متابعة الاتجاه"},
        ],
        "active": state.auto_config.get("strategy", "scalping"),
    }


@app.get("/api/prices")
def get_current_prices():
    return {
        "prices": state.price_cache,
        "timestamp": int(time.time() * 1000),
    }


# ============ Start Background Threads ============
price_thread = threading.Thread(target=price_polling_loop, daemon=True)
price_thread.start()

auto_thread = threading.Thread(target=auto_trading_loop, daemon=True)
auto_thread.start()

expiry_thread = threading.Thread(target=trade_expiry_loop, daemon=True)
expiry_thread.start()

# ============ Main ============
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 3004))
    logger.info(f"🚀 Starting Expert Option Bridge v2.0 on port {port}")
    logger.info(f"📡 HTTP API: http://localhost:{port}/api/")
    logger.info(f"🔌 WebSocket: ws://localhost:{port}/ws")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")

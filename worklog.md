done

---
Task ID: 1
Agent: main
Task: Add Alfa Option branding, landing page, activation code system, and Alfa Coins protection fund system

Work Log:
- Read uploaded robot image (cyberpunk AI trading robot) and copied to /public/robot-image.png
- Created new SVG logo with α (alpha) symbol for Alfa Option branding
- Created landing page at `/` with: Alfa Option branding, robot image, $150/month subscription card, bot power stats, Alfa Coins explanation, big "دخول البوت" button
- Created activation code flow: Enter Bot → Activation code input → Verify → Login
- Added `/api/verify-code` endpoint to Python bridge with valid codes (ALFA-2024-PRO, etc.)
- Moved trading platform to `/trading` route with Alfa Option branding
- Updated Zustand store with full Alfa Coins system: earn 100α per 100 trades, auto-protection against losses (1α = $0.10), protection funds, transaction history
- Added Alfa Coins progress bar in trading header showing progress to next reward
- Rebuilt protection page with Alfa Coins system (overview, funds list, transaction history, how-it-works guide)
- Updated all branding from "Alfa Expert" to "Alfa Option" across layout, manifest, pages
- Built and verified all routes: /, /login, /trading, /protection
- All 3 PM2 services running: trading-app, trading-ws, eo-bridge

Stage Summary:
- Landing page: Alfa Option branding with robot image, $150/month subscription, bot description, enter bot button
- Activation system: Code verification API + UI flow (enter code / buy code)
- Alfa Coins: 100α per 100 trades, auto-protection 1α=$0.10, toggle on/off, progress bar, funds list, transaction history
- Routes: / (landing), /activate (in landing), /login, /trading (platform), /protection (alfa coins)
- All services online and verified

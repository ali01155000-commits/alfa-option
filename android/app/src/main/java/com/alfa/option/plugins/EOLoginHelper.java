package com.alfa.option.plugins;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.Dialog;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.util.Timer;
import java.util.TimerTask;

/**
 * EOLoginHelper v6 - Browser Bot (NO token extraction at all).
 *
 * Opens Expert Option in a fullscreen in-app browser. The user logs in
 * normally. As soon as the account page is detected (balance visible),
 * a bot loop runs INSIDE the same WebView:
 *   - sets the trade amount on the platform
 *   - clicks the platform's own Up/Down buttons (DOM automation)
 *   - one trade at a time; waits for the result via balance change
 *   - martingale recovery, profit/loss limits, max trades
 * Every step is reported to the server (/api/bot-report + debug-log).
 */
public class EOLoginHelper {

    public interface Callback {
        void onError(String error);
    }

    private static final String START_URL = "https://expertoption.com/login";
    private static final long POLL_MS = 1500;
    private static final long TIMEOUT_MS = 600_000; // 10 min watchdog

    private static Dialog dialog;
    private static WebView webView;
    private static TextView statusView;
    private static volatile boolean open = false;
    private static Timer botTimer;
    private static final Handler mainHandler = new Handler(Looper.getMainLooper());
    private static int fillAttempts = 0;
    private static String cfgJson = "{}";
    private static String lastBeaconSt = "";

    /** Holds the site origin so beacons know where to go. */
    private static final class ORIGIN_HOLDER { static volatile String origin; }

    /** Set once by MainActivity so diagnostics beacons reach the server. */
    public static void setOrigin(String origin) { ORIGIN_HOLDER.origin = origin; }

    // ================= Diagnostics =================

    private static void beacon(final String tag, final String msg) {
        new Thread(() -> {
            HttpURLConnection c = null;
            try {
                String origin = ORIGIN_HOLDER.origin;
                if (origin == null) return;
                String qs = "tag=" + URLEncoder.encode(tag, "UTF-8")
                          + "&msg=" + URLEncoder.encode(msg, "UTF-8");
                c = (HttpURLConnection) new URL(origin + "/api/debug-log?" + qs).openConnection();
                c.setConnectTimeout(3000);
                c.setReadTimeout(3000);
                c.connect();
            } catch (Exception ignored) {
            } finally {
                if (c != null) try { c.disconnect(); } catch (Exception ignored) {}
            }
        }, "alfa-beacon").start();
    }

    private static void postReport(final JSONObject o) {
        new Thread(() -> {
            HttpURLConnection c = null;
            try {
                String origin = ORIGIN_HOLDER.origin;
                if (origin == null) return;
                c = (HttpURLConnection) new URL(origin + "/api/bot-report").openConnection();
                c.setRequestMethod("POST");
                c.setDoOutput(true);
                c.setConnectTimeout(3000);
                c.setReadTimeout(3000);
                c.setRequestProperty("Content-Type", "application/json");
                try (OutputStream os = c.getOutputStream()) {
                    os.write(o.toString().getBytes("UTF-8"));
                }
                c.connect();
            } catch (Exception ignored) {
            } finally {
                if (c != null) try { c.disconnect(); } catch (Exception ignored) {}
            }
        }, "alfa-report").start();
    }

    // ================= Public API =================

    public static void openBot(final Activity activity, final String email, final String password,
                               final boolean autoFill, final String configJson, final Callback cb) {
        open = false;
        fillAttempts = 0;
        cfgJson = configJson == null ? "{}" : configJson;
        lastBeaconSt = "";
        beacon("bot", "openBot cfg=" + cfgJson);
        mainHandler.post(() -> {
            try {
                openWindow(activity, email, password, autoFill, cb);
            } catch (Exception e) {
                if (!open) { open = true; cb.onError("OPEN_ERROR: " + e.getMessage()); }
            }
        });
    }

    /** Stop the bot loop but keep the browser open so the user sees results. */
    public static void stopBot(String reason) {
        beacon("bot", "stop requested (" + reason + ")");
        if (webView != null) {
            try {
                webView.evaluateJavascript(
                    "(function(){if(window.__alfaBot){window.__alfaBot.stopped=true;return 'stopped';}return 'no-state';})()",
                    v -> setStatus(reason != null && reason.contains("page")
                        ? "⏹ البوت متوقف — المتصفح فاضل مفتوح تشوف نتيجتك"));
            } catch (Exception ignored) {}
        }
        cleanupTimer();
    }

    // ================= Window =================

    @SuppressLint("SetJavaScriptEnabled")
    private static void openWindow(final Activity activity, final String email, final String password,
                                   final boolean autoFill, final Callback cb) {
        dialog = new Dialog(activity, android.R.style.Theme_Black_NoTitleBar_Fullscreen);
        dialog.setCancelable(false);
        dialog.setOnDismissListener(d -> {
            if (!open) { open = true; cleanupTimer(); cb.onError("CANCELED"); }
            else cleanupTimer();
        });

        LinearLayout root = new LinearLayout(activity);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.parseColor("#272E4A"));

        LinearLayout header = new LinearLayout(activity);
        header.setOrientation(LinearLayout.VERTICAL);
        header.setBackgroundColor(Color.parseColor("#20283D"));
        header.setPadding(dp(activity, 12), dp(activity, 10), dp(activity, 12), dp(activity, 10));

        LinearLayout headerRow = new LinearLayout(activity);
        headerRow.setOrientation(LinearLayout.HORIZONTAL);
        headerRow.setGravity(Gravity.CENTER_VERTICAL);

        TextView title = new TextView(activity);
        title.setText("البوت شغال على المتصفح");
        title.setTextColor(Color.parseColor("#F5F5F5"));
        title.setTextSize(14);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        title.setLayoutParams(new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));

        Button stop = new Button(activity);
        stop.setText("⏹ إيقاف");
        stop.setTextColor(Color.parseColor("#FF9F43"));
        stop.setTextSize(12);
        stop.setBackgroundColor(Color.TRANSPARENT);
        stop.setPadding(dp(activity, 8), 0, dp(activity, 8), 0);
        stop.setOnClickListener(v -> stopBot("user"));

        Button cancel = new Button(activity);
        cancel.setText("إغلاق ✕");
        cancel.setTextColor(Color.parseColor("#D0011B"));
        cancel.setBackgroundColor(Color.TRANSPARENT);
        cancel.setOnClickListener(v -> {
            stopBot("close");
            mainHandler.postDelayed(() -> {
                open = true;
                dismissDialog();
            }, 400);
        });

        headerRow.addView(title);
        headerRow.addView(stop);
        headerRow.addView(cancel);

        statusView = new TextView(activity);
        statusView.setText("⏳ سجّل دخولك في Expert Option — أول ما حسابك يفتح، البوت يبدأ الصفقات تلقائي");
        statusView.setTextColor(Color.parseColor("#57BC9A"));
        statusView.setTextSize(11);
        statusView.setPadding(0, dp(activity, 4), 0, 0);

        header.addView(headerRow);
        header.addView(statusView);

        webView = new WebView(activity);
        webView.setLayoutParams(new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setSupportMultipleWindows(false);
        settings.setUserAgentString(settings.getUserAgentString()
                .replace("; wv", "") + " AlfaOptionApp/1.0");

        CookieManager cm = CookieManager.getInstance();
        cm.setAcceptCookie(true);
        cm.setAcceptThirdPartyCookies(webView, true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                setStatus("⏳ " + hostOf(url) + (autoFill ? " — جاري تعبئة بياناتك..." : " — سجل دخولك هنا"));
                if (autoFill) tryAutofill(view, email, password);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return false;
            }
        });

        root.addView(header);
        root.addView(webView);
        dialog.setContentView(root, new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        if (dialog.getWindow() != null) {
            dialog.getWindow().setBackgroundDrawable(new ColorDrawable(Color.parseColor("#272E4A")));
        }
        dialog.show();
        open = true;

        webView.loadUrl(START_URL);

        // ===== The bot loop: runs INSIDE the open browser =====
        botTimer = new Timer();
        botTimer.scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() {
                mainHandler.post(() -> {
                    if (webView == null || !open) return;
                    if (autoFill && fillAttempts < 10) tryAutofill(webView, email, password);
                    try {
                        webView.evaluateJavascript(botStepJs(), value -> handleStep(value));
                    } catch (Exception ignored) {}
                });
            }
        }, 2500, POLL_MS);

        mainHandler.postDelayed(() -> {
            if (!open) return;
            // watchdog: nothing to do - bot keeps its own lifecycle
        }, TIMEOUT_MS);
    }

    // ================= Bot step result handling =================

    private static void handleStep(String value) {
        if (value == null || "null".equals(value) || value.length() < 3) return;
        try {
            String raw = new org.json.JSONArray("[" + value + "]").getString(0);
            JSONObject o = new JSONObject(raw);
            String st = o.optString("st", "");
            int tr = o.optInt("tr", 0);
            double bal = o.optDouble("bal", Double.NaN);
            double pnl = o.optDouble("pnl", Double.NaN);
            double amt = o.optDouble("amt", 0);
            String d = o.optString("d", "");

            // Live Arabic status in the header
            String s;
            switch (st) {
                case "wait-login": s = "⏳ سجّل دخولك بالأعلى — البوت يبدأ تلقائي بعد فتح حسابك"; break;
                case "no-bal":    s = "⏳ انتظار فتح الحساب..."; break;
                case "no-amt":    s = "🔍 بادور على خانة المبلغ في المنصة..."; break;
                case "no-btn":    s = "🔍 بادور على أزرار التداول (شراء/بيع)..."; break;
                case "click":     s = "✅ صفقة #" + tr + " (" + ("up".equals(d) ? "شراء ⬆" : "بيع ⬇") + ") بمبلغ " + fmt(amt) + "$"; break;
                case "wait":      s = "⏳ صفقة #" + tr + " شغالة — انتظار النتيجة..."; break;
                case "win":       s = "🎉 ربحت! صفقة #" + tr + " — نرجع للمبلغ الأساسي"; break;
                case "loss":      s = "📉 خسرت صفقة #" + tr + (Double.isNaN(amt) ? "" : " — تعويض بـ " + fmt(amt) + "$"); break;
                case "skip":      s = "➖ نتيجة غير واضحة — نكمّل عادي"; break;
                case "done-max":     s = "🏁 انتهى البوت: اكتمل عدد الصفقات (" + tr + ")"; break;
                case "done-loss":    s = "🏁 انتهى البوت: حد الخسارة"; break;
                case "done-profit":  s = "🏁 انتهى البوت: حققت حد الربح 🎉"; break;
                case "stop":         s = "⏹ البوت متوقف"; break;
                default: s = st;
            }
            setStatus(s + (Double.isNaN(pnl) ? "" : "  |  النتيجة: " + (pnl >= 0 ? "+" : "") + fmt(pnl) + "$"));

            // One beacon per state change + every report to the server
            if (!st.equals(lastBeaconSt) || st.startsWith("done")) {
                lastBeaconSt = st;
                beacon("bot", st + " tr=" + tr + " bal=" + (Double.isNaN(bal) ? "-" : fmt(bal))
                        + " pnl=" + (Double.isNaN(pnl) ? "-" : fmt(pnl)));
            }
            postReport(o);

            if (st.startsWith("done") || "stop".equals(st)) cleanupTimer();
        } catch (Exception ignored) {}
    }

    private static String fmt(double v) {
        return (Math.abs(v - Math.rint(v)) < 0.005) ? String.valueOf((long) Math.rint(v)) : String.format("%.2f", v);
    }

    // ================= The injected bot (runs in the EO page) =================

    private static String botStepJs() {
        // All string literals use single quotes; JSON state lives on window.__alfaBot.
        return "(function(){"
            + "var B=window.__alfaBot;"
            + "if(!B){B=window.__alfaBot={cfg:" + cfgJson + ",tr:0,ls:0,pend:0,waitUntil:0,before:null,lastBal:null,balEl:null,startBal:null,stopped:false,dir:1,grace:0};}"
            + "function out(st,extra){var o={st:st,tr:B.tr,bal:B.lastBal,pnl:(B.startBal!==null&&B.lastBal!==null)?Math.round((B.lastBal-B.startBal)*100)/100:null,amt:B.pend>0?B.pend:B.cfg.amount};if(extra){o.d=extra.d;o.amt=extra.amt!==undefined?extra.amt:o.amt;}return JSON.stringify(o);}"
            + "if(B.stopped)return out('stop');"
            + "function txt(n){return (n.innerText||n.textContent||'').trim();}"
            + "function num(s){var m=String(s).replace(/[^0-9.\\-]/g,'');var f=parseFloat(m);return isNaN(f)?null:f;}"
            // ---- balance element: prefers a '$'-prefixed value in the top area ----
            + "function findBal(){"
            + " if(B.balEl&&document.contains(B.balEl)){var v0=num(txt(B.balEl));if(v0!==null){B.lastBal=v0;return v0;}}"
            + " var els=document.querySelectorAll('div,span,p');var best=null,bestV=null,bestTop=1e9;"
            + " for(var i=0;i<els.length;i++){var e=els[i];if(e.children.length>0)continue;var t=txt(e);"
            + "  if(t.length<2||t.length>15)continue;if(t.charAt(0)!=='$'&&t.indexOf('＄')!==0)continue;"
            + "  var v=num(t);if(v===null||v<=0)continue;var r=e.getBoundingClientRect();if(r.width===0||r.height===0)continue;"
            + "  if(r.top<bestTop){bestTop=r.top;best=e;bestV=v;}}"
            + " if(best){B.balEl=best;B.lastBal=bestV;if(B.startBal===null)B.startBal=bestV;return bestV;}"
            + " return null;"
            + "}"
            // ---- trade amount input ----
            + "function setAmount(v){"
            + " var sels=['input[type=number]','input[inputmode=decimal]'];var inp=null;"
            + " for(var i=0;i<sels.length&&!inp;i++){var q=document.querySelectorAll(sels[i]);if(q.length)inp=q[0];}"
            + " if(!inp){var all=document.querySelectorAll('input');"
            + "  outer:for(var j=0;j<all.length;j++){var a=all[j];var ty=(a.type||'text').toLowerCase();if(ty!=='text'&&ty!=='number'&&ty!=='tel')continue;"
            + "   var p=a;for(var k=0;k<5&&p;p++){var c=(p.getAttribute('class')||'')+' '+(p.getAttribute('aria-label')||'');if(/amount|مبلغ/i.test(c)){inp=a;break outer;}p=p.parentElement;}}}"
            + " if(!inp)return false;"
            + " try{var setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;"
            + "  setter.call(inp,String(v));inp.dispatchEvent(new Event('input',{bubbles:true}));inp.dispatchEvent(new Event('change',{bubbles:true}));return true;}catch(e){return false;}"
            + "}"
            // ---- Up / Down buttons: class/text hints then green/red colors ----
            + "function findButtons(){"
            + " var up=null,down=null;var els=document.querySelectorAll('button,[role=button]');"
            + " for(var i=0;i<els.length;i++){var e=els[i];var r=e.getBoundingClientRect();"
            + "  if(r.width<55||r.height<26)continue;"
            + "  var c=(((e.getAttribute('class')||'')+' '+(e.getAttribute('aria-label')||'')+' '+(e.getAttribute('title')||'')+' '+txt(e)).toLowerCase());"
            + "  if(c.length>120)continue;"
            + "  var rgb=null;try{rgb=getComputedStyle(e).backgroundColor.match(/[\\d.]+/g);}catch(x){}"
            + "  var R=rgb?+rgb[0]:-1,G=rgb?+rgb[1]:-1,Bl=rgb?+rgb[2]:-1;"
            + "  var green=(G>=0&&G>R+30&&G>Bl+30),red=(R>=0&&R>G+30&&R>Bl+30);"
            + "  if(!up&&(/(call|buy|higher|up\\b|above|أعلى|شراء)/.test(c)||green))up=e;"
            + "  else if(!down&&(/(put|sell|lower|down\\b|below|أدنى|بيع)/.test(c)||red))down=e;"
            + " }"
            + " return {up:up,down:down};"
            + "}"
            // ================= one bot step =================
            + "var now=Date.now();"
            + "var bal=findBal();"
            + "if(bal===null){"
            + " if(document.querySelector('input[type=password]'))return out('wait-login');"
            + " return out('no-bal');"
            + "}"
            // resolve an open trade's result via balance change
            + "if(B.before!==null){"
            + " if(now<B.waitUntil)return out('wait');"
            + " if(bal!==B.before){"
            + "  var won=bal>B.before;B.before=null;B.grace=0;"
            + "  if(won){B.ls=0;B.pend=0;return out('win');}"
            + "  B.ls++;"
            + "  if(B.cfg.recovery){var m=Math.max(1.1,Math.min(5,B.cfg.multiplier||2));var nx=B.cfg.amount*Math.pow(m,B.ls);B.pend=Math.max(1,Math.min(100,Math.round(nx*100)/100));}"
            + "  else{B.pend=0;}"
            + "  return out('loss');"
            + " }"
            + " B.grace++;"
            + " if(B.grace>10){B.before=null;B.grace=0;return out('skip');}" // balance unchanged too long - move on without martingale
            + " return out('wait');"
            + "}"
            // limits
            + "var pnl=bal-(B.startBal===null?bal:B.startBal);"
            + "if(B.cfg.maxTrades>0&&B.tr>=B.cfg.maxTrades){B.stopped=true;return out('done-max');}"
            + "if(pnl<=-B.cfg.maxDailyLoss){B.stopped=true;return out('done-loss');}"
            + "if(B.cfg.maxDailyProfit>0&&pnl>=B.cfg.maxDailyProfit){B.stopped=true;return out('done-profit');}"
            // place the next trade
            + "var amt=B.pend>0?B.pend:B.cfg.amount;"
            + "if(!setAmount(amt))return out('no-amt');"
            + "var btns=findButtons();"
            + "if(!btns.up||!btns.down)return out('no-btn');"
            + "B.dir=(B.dir===1)?2:1;"
            + "var btn=(B.dir===1)?btns.up:btns.down;"
            + "try{btn.click();}catch(e){return out('no-btn');}"
            + "B.tr++;B.before=bal;B.waitUntil=now+(B.cfg.expiryMs||60000)+2500;B.grace=0;"
            + "return out('click',{d:(B.dir===1)?'up':'down',amt:amt});"
            + "})()";
    }

    // ================= Autofill (login page only) =================

    private static void tryAutofill(WebView view, String email, String password) {
        if (!open || view == null || email == null || email.isEmpty() || password == null || password.isEmpty()) return;
        String url = view.getUrl();
        if (url == null || !url.contains("expertoption.com")) return;
        if (url.contains("/login") || url.equals("https://expertoption.com/")) {
            view.evaluateJavascript(buildAutoFillJs(email, password), value -> {
                if (value != null && value.contains("filled")) {
                    fillAttempts = 10;
                    setStatus("✅ تم تعبئة بياناتك — في انتظار فتح الحساب...");
                }
            });
            fillAttempts++;
        }
    }

    private static String buildAutoFillJs(String email, String password) {
        String safeEmail = email.replace("\\", "\\\\").replace("'", "\\'");
        String safePass = password.replace("\\", "\\\\").replace("'", "\\'");
        return "(function(){"
            + "function setVal(el,v){var s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;s.call(el,v);"
            + " el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}"
            + "var e=document.querySelector('input[type=email]')||document.querySelector('input[name=email]');"
            + "var p=document.querySelector('input[type=password]');"
            + "if(!e){var all=document.querySelectorAll('input');for(var i=0;i<all.length;i++){var t=(all[i].type||'').toLowerCase();if(t==='text'||t==='tel'){e=all[i];break;}}}"
            + "if(e&&p){setVal(e,'" + safeEmail + "');setVal(p,'" + safePass + "');"
            + " setTimeout(function(){var b=document.querySelector('button[type=submit]')||Array.from(document.querySelectorAll('button,input[type=submit]')).find(function(x){return /log\\s*in|sign\\s*in|تسجيل|دخول/i.test((x.textContent||'')+(x.value||''));});if(b)b.click();},1500);"
            + " return 'filled';}"
            + "return 'no-form';"
            + "})()";
    }

    // ================= UI helpers =================

    private static void setStatus(final String text) {
        TextView tv = statusView;
        if (tv != null) mainHandler.post(() -> tv.setText(text));
    }

    private static String hostOf(String url) {
        if (url == null) return "";
        try {
            return new java.net.URI(url).getHost();
        } catch (Exception e) {
            return url.length() > 40 ? url.substring(0, 40) : url;
        }
    }

    private static void cleanupTimer() {
        if (botTimer != null) {
            botTimer.cancel();
            botTimer = null;
        }
    }

    private static void dismissDialog() {
        final Dialog d = dialog;
        if (d != null) {
            mainHandler.post(() -> {
                try {
                    if (webView != null) {
                        webView.stopLoading();
                        webView.loadUrl("about:blank");
                    }
                    d.dismiss();
                } catch (Exception ignored) {}
            });
        }
    }

    private static int dp(Activity activity, int v) {
        float density = activity.getResources().getDisplayMetrics().density;
        return Math.round(v * density);
    }
}

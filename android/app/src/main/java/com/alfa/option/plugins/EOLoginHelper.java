package com.alfa.option.plugins;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.Dialog;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.util.Collections;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Set;
import java.util.Timer;
import java.util.TimerTask;

/**
 * EOLoginHelper v4 - Standalone (no Capacitor bridge needed).
 *
 * Flow (matches the web /setup page):
 *   1. Opens Expert Option login in a fullscreen dialog WebView (autofills if given).
 *   2. Scans EVERY source for candidate tokens:
 *        - cookies of the current page URL (any EO subdomain, HttpOnly included)
 *        - cookies of known EO domains
 *        - localStorage / sessionStorage (exact 'ssid' key, embedded "ssid":"..." blobs, fuzzy keys)
 *        - hooked WebSocket/XHR/fetch auth traffic
 *   3. Delivers each NEW candidate to the page via window.__eoToken(token).
 *      Does NOT close - the page verifies it with the server, then replies:
 *        eologin://result?ok=1            -> token valid, close the dialog
 *        eologin://result?ok=0&token=...  -> rejected, keep scanning for a better one
 *   4. "I'm logged in - return to bot" button force-scans everything.
 */
public class EOLoginHelper {

    public interface Callback {
        void onToken(String token);
        void onError(String error);
    }

    public static final String[] EO_DOMAINS = {
            "https://expertoption.com",
            "https://www.expertoption.com",
            "https://app.expertoption.com",
            "https://mobile.expertoption.com",
            "https://api.expertoption.com"
    };
    private static final long TIMEOUT_MS = 340_000; // page watchdog is 300s - stay longer
    private static final long POLL_MS = 1200;

    private static Dialog dialog;
    private static WebView webView;
    private static TextView statusView;
    private static volatile boolean resolved = false;
    private static Timer pollTimer;
    private static final Handler mainHandler = new Handler(Looper.getMainLooper());
    private static int fillAttempts = 0;

    /** Tokens the server rejected - never deliver these again. */
    private static final Set<String> rejected =
            Collections.synchronizedSet(new HashSet<String>());
    /** Last candidate delivered to the page (avoid re-delivering the same one). */
    private static volatile String lastDelivered = null;
    /** Latest undelivered result for the polling backup channel. */
    private static volatile String pendingJson = null;

    /** Diagnostics beacon - lands in the eo-bridge server log. */
    private static void beacon(final String msg) {
        new Thread(() -> {
            HttpURLConnection c = null;
            try {
                String origin = ORIGIN_HOLDER.origin;
                if (origin == null) return;
                String qs = "tag=native&msg=" + URLEncoder.encode(msg, "UTF-8");
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

    /** Holds the site origin so beacons know where to go. */
    private static final class ORIGIN_HOLDER { static volatile String origin; }

    /** Set once by MainActivity so diagnostics beacons reach the server. */
    public static void setOrigin(String origin) { ORIGIN_HOLDER.origin = origin; }

    /**
     * Backup channel: the page polls this from JS via
     * window.__alfaNative.poll() (added with addJavascriptInterface).
     */
    public static class NativePoll {
        @JavascriptInterface
        public String poll() {
            String j = pendingJson;
            pendingJson = null;
            return j == null ? "" : j;
        }
    }

    /**
     * Injected on every page start/finish AND re-injected by the poll timer.
     * Wraps WebSocket.send, XHR and fetch so any auth payload like
     * "ssid":"..." or token=... is captured into window.__alfaCap.
     */
    private static final String HOOK_JS =
        "(function(){try{" +
        "if(window.__alfaHooked)return;" +
        "window.__alfaHooked=true;window.__alfaCap={};" +
        "function cap(s){try{" +
        "if(!s)return;var str=String(s);if(str.length<6||str.length>200000)return;" +
        "var keys=['ssid','auth_token','access_token','session','token'];" +
        "for(var i=0;i<keys.length;i++){" +
        "var pat='\"'+keys[i]+'\":\"';var idx=str.indexOf(pat);" +
        "if(idx<0){pat=keys[i]+'=';idx=str.indexOf(pat);}" +
        "if(idx>=0){" +
        "var st=idx+pat.length;var en=str.indexOf('\"',st);" +
        "if(en<0)en=Math.min(st+256,str.length);" +
        "var v=str.substring(st,en).split('&')[0];" +
        "if(v.length>=6&&v.length<=256&&!window.__alfaCap[keys[i]])window.__alfaCap[keys[i]]=v;" +
        "}}}" +
        "catch(e){}}" +
        "try{var ws=WebSocket.prototype.send;WebSocket.prototype.send=function(d){cap(d);return ws.apply(this,arguments);};}catch(e){}" +
        "try{var xo=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u){try{cap(u);}catch(e){}return xo.apply(this,arguments);};" +
        "var xs=XMLHttpRequest.prototype.send;XMLHttpRequest.prototype.send=function(b){" +
        "try{cap(b);var x=this;var oc=x.onreadystatechange;x.onreadystatechange=function(){" +
        "try{if(x.responseText)cap(x.responseText);}catch(e){}if(oc)oc.apply(x,arguments);};}catch(e){}" +
        "return xs.apply(this,arguments);};}catch(e){}" +
        "try{var ff=window.fetch;window.fetch=function(){try{var u=arguments[0];" +
        "cap(typeof u==='string'?u:(u&&u.url));if(arguments[1]&&arguments[1].body)cap(arguments[1].body);}catch(e){}" +
        "return ff.apply(this,arguments);};}catch(e){}" +
        "}catch(e){}})();";

    /**
     * Collects everything visible to the page: href, captured tokens,
     * all localStorage + sessionStorage entries and document.cookie.
     */
    private static final String SCAN_JS =
        "(function(){try{" +
        "var out={href:location.href};" +
        "out.cap=window.__alfaCap||null;" +
        "var ls={},ss={};try{" +
        "for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);var v=localStorage.getItem(k);" +
        "if(v)ls[k]=v.length<=2048?v:v.substring(0,2048);}" +
        "}catch(e){}" +
        "try{" +
        "for(var j=0;j<sessionStorage.length;j++){var k2=sessionStorage.key(j);var v2=sessionStorage.getItem(k2);" +
        "if(v2)ss[k2]=v2.length<=2048?v2:v2.substring(0,2048);}" +
        "}catch(e){}" +
        "out.ls=ls;out.ss=ss;" +
        "try{out.cookie=document.cookie||'';}catch(e){out.cookie='';}" +
        "return JSON.stringify(out);" +
        "}catch(e){return JSON.stringify({err:String(e),href:location.href});}})();";

    public static void open(final Activity activity, final String email, final String password,
                            final boolean autoFill, final Callback cb) {
        resolved = false;
        fillAttempts = 0;
        lastDelivered = null;
        pendingJson = null;
        rejected.clear();
        beacon("open email=" + (email == null || email.isEmpty() ? "manual" : "autofill"));
        mainHandler.post(() -> {
            try {
                openWindow(activity, email, password, autoFill, cb);
            } catch (Exception e) {
                if (!resolved) { resolved = true; cb.onError("OPEN_ERROR: " + e.getMessage()); }
            }
        });
    }

    /** The server approved the last delivered token - close the EO screen. */
    public static void confirmSuccess() {
        if (resolved) return;
        beacon("confirmed-ok");
        resolved = true;
        cleanupTimer();
        setStatus("✅ تم ربط حسابك وتشغيل البوت! جاري الإغلاق...");
        dismissDialog();
    }

    /** The server rejected this token - blacklist it and keep scanning. */
    public static void rejectToken(String token) {
        if (token != null && !token.isEmpty()) rejected.add(token);
        if (token != null && token.equals(lastDelivered)) lastDelivered = null;
        beacon("rejected len=" + (token == null ? 0 : token.length()));
        setStatus("❌ السيرفر رفض التوكن ده — جاري البحث عن التوكن الصحيح...");
    }

    @SuppressLint("SetJavaScriptEnabled")
    private static void openWindow(final Activity activity, final String email, final String password,
                                   final boolean autoFill, final Callback cb) {
        dialog = new Dialog(activity, android.R.style.Theme_Black_NoTitleBar_Fullscreen);
        dialog.setCancelable(false);
        dialog.setOnDismissListener(d -> {
            if (!resolved) { resolved = true; cleanupTimer(); cb.onError("CANCELED"); }
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
        title.setText("تسجيل الدخول إلى Expert Option");
        title.setTextColor(Color.parseColor("#F5F5F5"));
        title.setTextSize(14);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        title.setLayoutParams(new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));

        Button done = new Button(activity);
        done.setText("✓ دخلت");
        done.setTextColor(Color.parseColor("#57BC9A"));
        done.setTextSize(12);
        done.setBackgroundColor(Color.TRANSPARENT);
        done.setPadding(dp(activity, 8), 0, dp(activity, 8), 0);
        done.setOnClickListener(v -> {
            setStatus("🔍 فحص شامل للتوكن...");
            scanNow(cb, true);
        });

        Button cancel = new Button(activity);
        cancel.setText("إلغاء ✕");
        cancel.setTextColor(Color.parseColor("#D0011B"));
        cancel.setBackgroundColor(Color.TRANSPARENT);
        cancel.setOnClickListener(v -> dismissDialog());

        headerRow.addView(title);
        headerRow.addView(done);
        headerRow.addView(cancel);

        statusView = new TextView(activity);
        statusView.setText("⏳ جاري فتح صفحة الدخول...");
        statusView.setTextColor(Color.parseColor("#57BC9A"));
        statusView.setTextSize(11);
        statusView.setPadding(0, dp(activity, 4), 0, 0);

        header.addView(headerRow);
        header.addView(statusView);

        webView = new WebView(activity);
        webView.setLayoutParams(new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));
        // Backup channel for delivering the token to the page
        webView.addJavascriptInterface(new NativePoll(), "__alfaNative");

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
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                // Install hooks BEFORE the page's own scripts create sockets/requests
                view.evaluateJavascript(HOOK_JS, null);
                setStatus("⏳ جاري تحميل " + hostOf(url) + " ...");
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                view.evaluateJavascript(HOOK_JS, null);
                setStatus("⏳ صفحة الدخول جاهزة" + (autoFill ? " — جاري تعبئة بياناتك..." : " — سجل دخولك هنا"));
                scanNow(cb, false);
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

        webView.loadUrl(EO_DOMAINS[0] + "/login");

        pollTimer = new Timer();
        pollTimer.scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() {
                mainHandler.post(() -> {
                    // Re-inject the hook (cheap - guarded by __alfaHooked) so sockets
                    // created right after navigation are also captured.
                    if (webView != null) webView.evaluateJavascript(HOOK_JS, null);
                    scanNow(cb, false);
                    if (autoFill && fillAttempts < 10) {
                        final WebView wv = webView;
                        if (wv != null) mainHandler.post(() -> tryAutofill(wv, email, password));
                    }
                });
            }
        }, POLL_MS, POLL_MS);

        mainHandler.postDelayed(() -> {
            if (!resolved) {
                // Final chance: force a deep scan before giving up
                scanNow(cb, true);
                mainHandler.postDelayed(() -> {
                    if (!resolved) {
                        resolved = true;
                        cleanupTimer();
                        dismissDialog();
                        cb.onError("TIMEOUT");
                    }
                }, 2500);
            }
        }, TIMEOUT_MS);
    }

    // ================= Token scanning =================

    private static void scanNow(final Callback cb, final boolean force) {
        if (resolved || webView == null) return;
        final String url = webView.getUrl();
        boolean onLogin = isLoginUrl(url);

        // 1) ssid cookie for the CURRENT page URL (any subdomain, HttpOnly included)
        String ssid = null;
        String src = null;
        if (url != null && url.startsWith("http")) {
            ssid = extractSsid(CookieManager.getInstance().getCookie(url));
            if (ssid != null) src = "cookie:page";
        }
        if (ssid == null) {
            for (String d : EO_DOMAINS) {
                ssid = extractSsid(CookieManager.getInstance().getCookie(d));
                if (ssid != null) { src = "cookie:" + d; break; }
            }
        }
        if (ssid != null && (!onLogin || force)) { deliver(cb, ssid, src); return; }

        // 2) Deep scan inside the page (storage + hook + document.cookie)
        try {
            webView.evaluateJavascript(SCAN_JS, value -> parseScan(cb, value, url, force));
        } catch (Exception ignored) {}
    }

    private static void parseScan(final Callback cb, String value, String pageUrl, boolean force) {
        if (resolved || value == null || "null".equals(value)) return;
        try {
            String raw = new JSONArray("[" + value + "]").getString(0);
            JSONObject o = new JSONObject(raw);
            String href = o.optString("href", "");
            boolean onLogin = isLoginUrl(!href.isEmpty() ? href : pageUrl);

            // (a) Hooked auth traffic - the app authenticated, this IS the token
            JSONObject cap = o.optJSONObject("cap");
            if (cap != null) {
                String[] pref = {"ssid", "auth_token", "access_token"};
                for (String k : pref) {
                    String v = cap.optString(k, null);
                    if (v != null && v.length() >= 6) { deliver(cb, v, "hook:" + k); return; }
                }
                if (force) {
                    String v = cap.optString("token", null);
                    if (v != null && v.length() >= 6) { deliver(cb, v, "hook:token"); return; }
                }
            }

            // (b) exact 'ssid' key in localStorage / sessionStorage
            String[] stores = {"ls", "ss"};
            for (String st : stores) {
                JSONObject m = o.optJSONObject(st);
                if (m == null) continue;
                Iterator<String> it = m.keys();
                while (it.hasNext()) {
                    String k = it.next();
                    String kl = k == null ? "" : k.toLowerCase();
                    if (!kl.equals("ssid")) continue;
                    String v = m.optString(k, "");
                    if (v.length() >= 6 && (!onLogin || force)) {
                        deliver(cb, v, "storage:" + st + "[ssid]"); return;
                    }
                }
            }

            // (c) values that CONTAIN "ssid":"..." (e.g. a JSON user blob)
            for (String st : stores) {
                JSONObject m = o.optJSONObject(st);
                if (m == null) continue;
                Iterator<String> it = m.keys();
                while (it.hasNext()) {
                    String k = it.next();
                    String v = m.optString(k, "");
                    String found = extractEmbeddedSsid(v);
                    if (found != null && (!onLogin || force)) {
                        deliver(cb, found, "storage:" + st + "[" + k + "]"); return;
                    }
                }
            }

            // (d) document.cookie ssid (JS-visible cookies)
            String dssid = extractSsid(o.optString("cookie", ""));
            if (dssid != null && (!onLogin || force)) { deliver(cb, dssid, "doc-cookie"); return; }

            // (e) fuzzy token-like keys - only on manual press / timeout
            if (force) {
                for (String st : stores) {
                    JSONObject m = o.optJSONObject(st);
                    if (m == null) continue;
                    Iterator<String> it = m.keys();
                    while (it.hasNext()) {
                        String k = it.next();
                        String kl = k == null ? "" : k.toLowerCase();
                        if (kl.contains("ssid") || kl.contains("token") || kl.contains("auth")) {
                            String v = m.optString(k, "");
                            if (isTokenLike(v)) { deliver(cb, v, "fuzzy:" + k); return; }
                        }
                    }
                }
            }

            int keys = (o.optJSONObject("ls") == null ? 0 : o.optJSONObject("ls").length())
                     + (o.optJSONObject("ss") == null ? 0 : o.optJSONObject("ss").length());
            setStatus("🔍 " + hostOf(href) + (onLogin
                    ? " — سجل دخولك بالأعلى وبعد الدخول اضغط ✓ دخلت"
                    : " — جاري قراءة التوكن... (" + keys + " مفتاح)"));
        } catch (Exception ignored) {}
    }

    /**
     * Hands a NEW candidate to the web page for server verification.
     * The dialog stays OPEN until eologin://result?ok=1 (confirmSuccess)
     * or the whole login is cancelled/timed out.
     */
    private static synchronized void deliver(Callback cb, String token, String source) {
        if (resolved || token == null || token.isEmpty()) return;
        if (token.equals(lastDelivered) || rejected.contains(token)) return;
        lastDelivered = token;
        beacon("deliver len=" + token.length() + " src=" + source);
        setStatus("⏳ تم العثور على توكن (" + source + ") — جاري التحقق منه مع السيرفر...");
        // Also queue for the polling backup channel
        try {
            pendingJson = new JSONObject().put("token", token).toString();
        } catch (Exception ignored) {}
        cb.onToken(token);
    }

    private static boolean isLoginUrl(String url) {
        if (url == null) return true; // unknown page - stay cautious
        String u = url.toLowerCase();
        return u.contains("login") || u.contains("signin") || u.contains("sign-in")
                || u.contains("signup") || u.contains("sign-up") || u.contains("/auth")
                || u.contains("register");
    }

    private static String extractSsid(String cookies) {
        if (cookies == null) return null;
        for (String c : cookies.split(";")) {
            String t = c.trim();
            String tl = t.toLowerCase();
            if (tl.startsWith("ssid=") && t.length() > 10) {
                return t.substring(5).split(";")[0];
            }
        }
        return null;
    }

    private static String extractEmbeddedSsid(String v) {
        if (v == null) return null;
        String[] pats = {"ssid\":\"", "ssid\\\":\\\"", "ssid="};
        for (String pat : pats) {
            int i = v.indexOf(pat);
            if (i >= 0) {
                int st = i + pat.length();
                int en = v.indexOf('"', st);
                if (en < 0 || en > st + 256) en = Math.min(st + 256, v.length());
                String tok = v.substring(st, en).split("&")[0];
                if (tok.length() >= 6) return tok;
            }
        }
        return null;
    }

    private static boolean isTokenLike(String v) {
        if (v == null || v.length() < 8 || v.length() > 512) return false;
        if (v.startsWith("{") || v.startsWith("[")) return false;
        for (char c : v.toCharArray()) {
            boolean ok = (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9')
                    || c == '_' || c == '-' || c == '.' || c == '=' || c == '+'
                    || c == '/' || c == ':' || c == '%' || c == '~';
            if (!ok) return false;
        }
        return true;
    }

    // ================= Autofill =================

    private static void tryAutofill(WebView view, String email, String password) {
        if (resolved || view == null) return;
        String url = view.getUrl();
        if (url == null || !url.contains("expertoption.com")) return;
        if (url.contains("/login") || url.equals("https://expertoption.com/")) {
            view.evaluateJavascript(buildAutoFillJs(email, password), value -> {
                if (value != null && value.contains("filled")) {
                    fillAttempts = 10;
                    setStatus("✅ تم تعبئة بياناتك — في انتظار تأكيد الدخول...");
                }
            });
            fillAttempts++;
        }
    }

    private static String buildAutoFillJs(String email, String password) {
        String safeEmail = email.replace("\\", "\\\\").replace("'", "\\'");
        String safePass = password.replace("\\", "\\\\").replace("'", "\\'");
        return "(function(){" +
            "function setVal(el, v){" +
            "  var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;" +
            "  setter.call(el, v);" +
            "  el.dispatchEvent(new Event('input', {bubbles: true}));" +
            "  el.dispatchEvent(new Event('change', {bubbles: true}));" +
            "}" +
            "var inputs = document.querySelectorAll('input');" +
            "var e = document.querySelector('input[type=email]') || document.querySelector('input[name=email]') || document.querySelector('input#email');" +
            "var p = document.querySelector('input[type=password]') || document.querySelector('input[name=password]');" +
            "if (!e) { for (var i=0;i<inputs.length;i++){ var it=inputs[i]; var t=(it.type||'').toLowerCase(); if(t==='text' || t==='email' || t==='tel') { e = it; break; } } }" +
            "if (e && p) {" +
            "  setVal(e, '" + safeEmail + "');" +
            "  setVal(p, '" + safePass + "');" +
            "  setTimeout(function(){" +
            "    var b = document.querySelector('button[type=submit]') || Array.from(document.querySelectorAll('button, input[type=submit]')).find(function(x){return /log\\s*in|sign\\s*in|تسجيل|دخول/i.test((x.textContent||'') + (x.value||''));});" +
            "    if (b) b.click();" +
            "  }, 1500);" +
            "  return 'filled';" +
            "}" +
            "return 'no-form';" +
            "})()";
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
        if (pollTimer != null) {
            pollTimer.cancel();
            pollTimer = null;
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

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

import java.util.Timer;
import java.util.TimerTask;

/**
 * EOLoginHelper - Standalone (no Capacitor bridge needed).
 * Opens Expert Option login in a dialog WebView, auto-fills credentials,
 * and captures the ssid token from cookies (any EO domain) or localStorage.
 */
public class EOLoginHelper {

    public interface Callback {
        void onToken(String token);
        void onError(String error);
    }

    public static final String[] EO_DOMAINS = {
            "https://expertoption.com",
            "https://app.expertoption.com",
            "https://api.expertoption.com"
    };
    private static final long TIMEOUT_MS = 180_000; // 3 minutes

    private static Dialog dialog;
    private static WebView webView;
    private static TextView statusView;
    private static volatile boolean resolved = false;
    private static Timer pollTimer;
    private static final Handler mainHandler = new Handler(Looper.getMainLooper());
    private static int fillAttempts = 0;

    public static void open(final Activity activity, final String email, final String password,
                            final boolean autoFill, final Callback cb) {
        resolved = false;
        fillAttempts = 0;
        mainHandler.post(() -> {
            try {
                openWindow(activity, email, password, autoFill, cb);
            } catch (Exception e) {
                if (!resolved) { resolved = true; cb.onError("OPEN_ERROR: " + e.getMessage()); }
            }
        });
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
        title.setTextSize(15);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        title.setLayoutParams(new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));

        Button cancel = new Button(activity);
        cancel.setText("إلغاء ✕");
        cancel.setTextColor(Color.parseColor("#D0011B"));
        cancel.setBackgroundColor(Color.TRANSPARENT);
        cancel.setOnClickListener(v -> dismissDialog());

        headerRow.addView(title);
        headerRow.addView(cancel);

        statusView = new TextView(activity);
        statusView.setText("⏳ جاري فتح صفحة الدخول...");
        statusView.setTextColor(Color.parseColor("#57BC9A"));
        statusView.setTextSize(12);
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
                setStatus("⏳ صفحة الدخول جاهزة" + (autoFill ? " — جاري تعبئة بياناتك..." : " — سجل دخولك هنا"));
                checkAllSources(cb);
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
                    checkAllSources(cb);
                    if (autoFill && fillAttempts < 10) {
                        final WebView wv = webView;
                        if (wv != null) mainHandler.post(() -> tryAutofill(wv, email, password));
                    }
                });
            }
        }, 1200, 1200);

        mainHandler.postDelayed(() -> {
            if (!resolved) {
                resolved = true;
                cleanupTimer();
                dismissDialog();
                cb.onError("TIMEOUT");
            }
        }, TIMEOUT_MS);
    }

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
            "if (!e) { for (var i=0;i<inputs.length;i++){ var it=inputs[i]; var t=(it.type||'').toLowerCase(); if (t==='text' || t==='email' || t==='tel') { e = it; break; } } }" +
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

    private static void checkAllSources(final Callback cb) {
        if (resolved || webView == null) return;

        for (String domain : EO_DOMAINS) {
            String ssid = extractSsid(CookieManager.getInstance().getCookie(domain));
            if (ssid != null) { finishWithToken(cb, ssid, "cookie:" + domain); return; }
        }

        webView.evaluateJavascript(
            "(function(){try{" +
            " var v = localStorage.getItem('ssid') || sessionStorage.getItem('ssid');" +
            " if(!v){ for (var i=0;i<localStorage.length;i++){ var k=localStorage.key(i); if(k && k.toLowerCase()==='ssid'){ v=localStorage.getItem(k); break; } } }" +
            " if(v) return v;" +
            "}catch(e){} return '';})()",
            value -> {
                if (value == null || resolved) return;
                String v = value.trim();
                if (v.startsWith("\"") && v.endsWith("\"") && v.length() > 20) {
                    v = v.substring(1, v.length() - 1);
                    finishWithToken(cb, v, "localStorage");
                }
            });
    }

    private static String extractSsid(String cookies) {
        if (cookies == null) return null;
        for (String c : cookies.split(";")) {
            String t = c.trim();
            if (t.startsWith("ssid=") && t.length() > 10) {
                return t.substring(5);
            }
        }
        return null;
    }

    private static synchronized void finishWithToken(Callback cb, String ssid, String source) {
        if (resolved) return;
        resolved = true;
        cleanupTimer();
        setStatus("✅ تم استخراج التوكن! جاري ربط حسابك...");
        dismissDialog();
        cb.onToken(ssid);
    }

    private static void setStatus(final String text) {
        TextView tv = statusView;
        if (tv != null) mainHandler.post(() -> tv.setText(text));
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

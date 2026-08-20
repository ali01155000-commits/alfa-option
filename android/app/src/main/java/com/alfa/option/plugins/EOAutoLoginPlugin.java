package com.alfa.option.plugins;

import android.annotation.SuppressLint;
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

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Timer;
import java.util.TimerTask;

/**
 * EOAutoLogin - Opens Expert Option login inside the app's WebView,
 * auto-fills the user's credentials, and captures the `ssid` token from
 * cookies (any EO domain) or localStorage. Runs on the USER's device so
 * there is no server geo-blocking.
 */
@CapacitorPlugin(name = "EOAutoLogin")
public class EOAutoLoginPlugin extends Plugin {

    public static final String[] EO_DOMAINS = {
            "https://expertoption.com",
            "https://app.expertoption.com",
            "https://api.expertoption.com"
    };
    private static final long TIMEOUT_MS = 180_000; // 3 minutes

    private Dialog dialog;
    private WebView webView;
    private TextView statusView;
    private volatile boolean resolved = false;
    private Timer pollTimer;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private PluginCall activeCall;
    private int fillAttempts = 0;

    @PluginMethod
    public void login(final PluginCall call) {
        final String email = call.getString("email", "");
        final String password = call.getString("password", "");
        final boolean autoFill = email != null && !email.isEmpty() && password != null && !password.isEmpty();

        activeCall = call;
        resolved = false;
        fillAttempts = 0;

        mainHandler.post(() -> {
            try {
                openLoginWindow(call, email, password, autoFill);
            } catch (Exception e) {
                if (!resolved) { resolved = true; call.reject("OPEN_ERROR: " + e.getMessage()); }
            }
        });
    }

    /** Simple availability ping so JS can verify the plugin exists. */
    @PluginMethod
    public void available(final PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("available", true);
        ret.put("version", 2);
        call.resolve(ret);
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void openLoginWindow(final PluginCall call, final String email, final String password, final boolean autoFill) {
        dialog = new Dialog(getActivity(), android.R.style.Theme_Black_NoTitleBar_Fullscreen);
        dialog.setCancelable(false);
        dialog.setOnDismissListener(d -> {
            if (!resolved) { resolved = true; cleanupTimer(); call.reject("CANCELED"); }
        });

        LinearLayout root = new LinearLayout(getActivity());
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.parseColor("#272E4A"));

        // ===== Header: title + status + cancel =====
        LinearLayout header = new LinearLayout(getActivity());
        header.setOrientation(LinearLayout.VERTICAL);
        header.setBackgroundColor(Color.parseColor("#20283D"));
        header.setPadding(dp(12), dp(10), dp(12), dp(10));

        LinearLayout headerRow = new LinearLayout(getActivity());
        headerRow.setOrientation(LinearLayout.HORIZONTAL);
        headerRow.setGravity(Gravity.CENTER_VERTICAL);

        TextView title = new TextView(getActivity());
        title.setText("تسجيل الدخول إلى Expert Option");
        title.setTextColor(Color.parseColor("#F5F5F5"));
        title.setTextSize(15);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        title.setLayoutParams(new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));

        Button cancel = new Button(getActivity());
        cancel.setText("إلغاء ✕");
        cancel.setTextColor(Color.parseColor("#D0011B"));
        cancel.setBackgroundColor(Color.TRANSPARENT);
        cancel.setOnClickListener(v -> dismissDialog());

        headerRow.addView(title);
        headerRow.addView(cancel);

        statusView = new TextView(getActivity());
        statusView.setText("⏳ جاري فتح صفحة الدخول...");
        statusView.setTextColor(Color.parseColor("#57BC9A"));
        statusView.setTextSize(12);
        statusView.setPadding(0, dp(4), 0, 0);

        header.addView(headerRow);
        header.addView(statusView);

        webView = new WebView(getActivity());
        webView.setLayoutParams(new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setSupportMultipleWindows(false);
        // Look less like a headless webview
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
                checkAllSources();
                if (autoFill) tryAutofill(view, email, password);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return false; // keep everything inside this webview
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

        // Poll every 1.2s: cookies on all EO domains + localStorage inside the page
        pollTimer = new Timer();
        pollTimer.scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() {
                mainHandler.post(() -> {
                    checkAllSources();
                    if (autoFill && fillAttempts < 10) {
                        final WebView wv = webView;
                        if (wv != null) mainHandler.post(() -> tryAutofill(wv, email, password));
                    }
                });
            }
        }, 1200, 1200);

        // Overall timeout
        mainHandler.postDelayed(() -> {
            if (!resolved) {
                resolved = true;
                cleanupTimer();
                dismissDialog();
                call.reject("TIMEOUT");
            }
        }, TIMEOUT_MS);
    }

    /** Autofill retries — EO is a SPA and the form may render late. */
    private void tryAutofill(WebView view, String email, String password) {
        if (resolved || view == null) return;
        String url = view.getUrl();
        if (url == null || !url.contains("expertoption.com")) return;
        if (url.contains("/login") || url.equals("https://expertoption.com/")) {
            view.evaluateJavascript(buildAutoFillJs(email, password), value -> {
                if (value != null && value.contains("filled")) {
                    fillAttempts = 10; // stop retrying
                    setStatus("✅ تم تعبئة بياناتك — في انتظار تأكيد الدخول...");
                }
            });
            fillAttempts++;
        }
    }

    private String buildAutoFillJs(String email, String password) {
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

    /** Check ssid in cookies of every EO domain AND in the page's localStorage/JS. */
    private void checkAllSources() {
        if (resolved || webView == null) return;

        // 1) CookieManager across domains
        for (String domain : EO_DOMAINS) {
            String ssid = extractSsid(CookieManager.getInstance().getCookie(domain));
            if (ssid != null) { finishWithToken(ssid, "cookie:" + domain); return; }
        }

        // 2) localStorage / JS variables inside the loaded page
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
                    finishWithToken(v, "localStorage");
                }
            });
    }

    private String extractSsid(String cookies) {
        if (cookies == null) return null;
        for (String c : cookies.split(";")) {
            String t = c.trim();
            if (t.startsWith("ssid=") && t.length() > 10) {
                return t.substring(5);
            }
        }
        return null;
    }

    private synchronized void finishWithToken(String ssid, String source) {
        if (resolved) return;
        resolved = true;
        cleanupTimer();
        setStatus("✅ تم استخراج التوكن! جاري ربط حسابك...");
        dismissDialog();
        if (activeCall != null) {
            JSObject ret = new JSObject();
            ret.put("token", ssid);
            ret.put("source", source);
            activeCall.resolve(ret);
        }
    }

    private void setStatus(final String text) {
        TextView tv = statusView;
        if (tv != null) mainHandler.post(() -> tv.setText(text));
    }

    private void cleanupTimer() {
        if (pollTimer != null) {
            pollTimer.cancel();
            pollTimer = null;
        }
    }

    private void dismissDialog() {
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

    private int dp(int v) {
        float density = getActivity().getResources().getDisplayMetrics().density;
        return Math.round(v * density);
    }
}

package com.alfa.option.plugins;

import android.annotation.SuppressLint;
import android.app.Dialog;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
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
 * auto-fills the user's credentials, and captures the `ssid` cookie
 * the moment login succeeds (works from the USER's device/IP, so no
 * server geo-blocking). The token is then returned to JS which logs
 * into the trading bridge.
 */
@CapacitorPlugin(name = "EOAutoLogin")
public class EOAutoLoginPlugin extends Plugin {

    public static final String EO_URL = "https://expertoption.com";
    private static final long TIMEOUT_MS = 150_000; // 2.5 minutes

    private Dialog dialog;
    private WebView webView;
    private volatile boolean resolved = false;
    private Timer pollTimer;
    private Handler mainHandler = new Handler(Looper.getMainLooper());
    private PluginCall activeCall;

    @PluginMethod
    public void login(final PluginCall call) {
        final String email = call.getString("email", "");
        final String password = call.getString("password", "");
        final boolean autoFill = email != null && !email.isEmpty() && password != null && !password.isEmpty();

        activeCall = call;
        resolved = false;

        mainHandler.post(() -> {
            try {
                openLoginWindow(call, email, password, autoFill);
            } catch (Exception e) {
                if (!resolved) { resolved = true; call.reject("OPEN_ERROR: " + e.getMessage()); }
            }
        });
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

        // Header bar with title + cancel button
        LinearLayout header = new LinearLayout(getActivity());
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setGravity(Gravity.CENTER_VERTICAL);
        header.setBackgroundColor(Color.parseColor("#20283D"));
        header.setPadding(dp(12), dp(8), dp(12), dp(8));

        TextView title = new TextView(getActivity());
        title.setText("تسجيل الدخول إلى Expert Option");
        title.setTextColor(Color.parseColor("#F5F5F5"));
        title.setTextSize(14);
        title.setLayoutParams(new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));

        Button cancel = new Button(getActivity());
        cancel.setText("إلغاء ✕");
        cancel.setTextColor(Color.parseColor("#D0011B"));
        cancel.setBackgroundColor(Color.TRANSPARENT);
        cancel.setOnClickListener(v -> dismissDialog());

        header.addView(title);
        header.addView(cancel);

        webView = new WebView(getActivity());
        webView.setLayoutParams(new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setUserAgentString(settings.getUserAgentString().replace("; wv", "") + " AlfaOptionApp/1.0");

        CookieManager cm = CookieManager.getInstance();
        cm.setAcceptCookie(true);
        cm.setAcceptThirdPartyCookies(webView, true);

        final boolean[] filled = {false};
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                checkCookie();
                if (autoFill && !filled[0] && url != null && url.contains("login")) {
                    filled[0] = true;
                    view.evaluateJavascript(buildAutoFillJs(email, password), null);
                }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return false; // load everything in the same webview
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

        webView.loadUrl(EO_URL + "/login");

        // Poll for the ssid cookie every second (SPA redirects may not fire onPageFinished)
        pollTimer = new Timer();
        pollTimer.scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() {
                mainHandler.post(() -> checkCookie());
            }
        }, 1000, 1000);

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
            "var e = document.querySelector('input[type=email]') || document.querySelector('input[name=email]') || document.querySelector('input#email');" +
            "var p = document.querySelector('input[type=password]');" +
            "if (e && p) {" +
            "  setVal(e, '" + safeEmail + "');" +
            "  setVal(p, '" + safePass + "');" +
            "  setTimeout(function(){" +
            "    var b = document.querySelector('button[type=submit]') || Array.from(document.querySelectorAll('button')).find(function(x){return /log\\s*in|sign\\s*in|تسجيل/i.test(x.textContent||'');});" +
            "    if (b) b.click();" +
            "  }, 1200);" +
            "  return 'filled';" +
            "}" +
            "return 'no-form';" +
            "})()";
    }

    private void checkCookie() {
        if (resolved || webView == null) return;
        String cookies = CookieManager.getInstance().getCookie(EO_URL);
        if (cookies != null) {
            for (String c : cookies.split(";")) {
                String t = c.trim();
                if (t.startsWith("ssid=") && t.length() > 10) {
                    if (!resolved) {
                        resolved = true;
                        cleanupTimer();
                        String ssid = t.substring(5);
                        dismissDialog();
                        JSObject ret = new JSObject();
                        ret.put("token", ssid);
                        if (activeCall != null) activeCall.resolve(ret);
                    }
                    return;
                }
            }
        }
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

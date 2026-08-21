package com.alfa.option;

import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import com.alfa.option.plugins.EOAutoLoginPlugin;
import com.alfa.option.plugins.EOLoginHelper;

import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(EOAutoLoginPlugin.class);

        WebView mainView = getBridge().getWebView();
        if (mainView != null) {
            EOLoginHelper.setOrigin("http://76.13.40.219:81");
            mainView.setWebViewClient(new BridgeWebViewClient(getBridge()) {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    Uri uri = request.getUrl();
                    if ("eologin".equals(uri.getScheme())) {
                        String host = uri.getHost() == null ? "" : uri.getHost();
                        switch (host) {
                            case "login":
                                handleBotLogin(uri);
                                break;
                            case "stop":
                                EOLoginHelper.stopBot("page");
                                break;
                        }
                        return true; // consumed - do not navigate
                    }
                    return super.shouldOverrideUrlLoading(view, request);
                }
            });
        }
    }

    /**
     * eologin://login?email=&password=&amount=&maxTrades=&maxDailyLoss=
     *            &maxDailyProfit=&expiryMinutes=&recovery=&multiplier=
     * Opens Expert Option in the in-app browser; once the user logs in,
     * the bot trades INSIDE that same browser (no token at all).
     */
    private void handleBotLogin(Uri uri) {
        String email = nvl(uri.getQueryParameter("email"));
        String password = nvl(uri.getQueryParameter("password"));

        try {
            JSONObject cfg = new JSONObject();
            cfg.put("amount", dval(uri, "amount", 5));
            cfg.put("maxTrades", (int) dval(uri, "maxTrades", 0));
            cfg.put("maxDailyLoss", dval(uri, "maxDailyLoss", 50));
            cfg.put("maxDailyProfit", dval(uri, "maxDailyProfit", 100));
            cfg.put("recovery", "1".equals(uri.getQueryParameter("recovery")));
            cfg.put("multiplier", dval(uri, "multiplier", 2));
            long minutes = Math.max(1, (long) dval(uri, "expiryMinutes", 1));
            cfg.put("expiryMs", minutes * 60000L);

            EOLoginHelper.openBot(this, email, password,
                    !email.isEmpty() && !password.isEmpty(), cfg.toString(),
                    error -> { /* surfaced via beacons */ });
        } catch (Exception e) {
            EOLoginHelper.stopBot("cfg-error");
        }
    }

    private static String nvl(String s) { return s == null ? "" : s; }

    private static double dval(Uri uri, String key, double def) {
        try {
            String v = uri.getQueryParameter(key);
            return v == null || v.isEmpty() ? def : Double.parseDouble(v);
        } catch (Exception e) {
            return def;
        }
    }
}

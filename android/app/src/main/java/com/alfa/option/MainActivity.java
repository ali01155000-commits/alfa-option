package com.alfa.option;

import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import com.alfa.option.plugins.EOAutoLoginPlugin;
import com.alfa.option.plugins.EOLoginHelper;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Capacitor JS-bridge path (kept as primary if available)
        registerPlugin(EOAutoLoginPlugin.class);

        // ===== URL-scheme path (works even when the JS bridge is not
        // injected into the remote page). The web page triggers it with
        // an iframe pointing to eologin://login?email=...&password=...
        // and listens for window.__eoToken(token).
        WebView mainView = getBridge().getWebView();
        if (mainView != null) {
            mainView.setWebViewClient(new BridgeWebViewClient(getBridge()) {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    Uri uri = request.getUrl();
                    if ("eologin".equals(uri.getScheme())) {
                        handleEoLogin(view, uri);
                        return true; // consumed - do not navigate
                    }
                    return super.shouldOverrideUrlLoading(view, request);
                }
            });
        }
    }

    private void handleEoLogin(final WebView mainView, Uri uri) {
        String email = uri.getQueryParameter("email");
        String password = uri.getQueryParameter("password");
        boolean autoFill = email != null && !email.isEmpty() && password != null && !password.isEmpty();

        EOLoginHelper.open(this, email == null ? "" : email, password == null ? "" : password,
                autoFill, new EOLoginHelper.Callback() {
            @Override
            public void onToken(String token) {
                sendToPage(mainView, token, null, 0);
            }

            @Override
            public void onError(String error) {
                sendToPage(mainView, null, error, 0);
            }
        });
    }

    /**
     * Delivers the token/error to the web page's window.__eoToken callback.
     * If the page is still loading and the callback is not defined yet,
     * retries a few times so the result is never lost.
     */
    private void sendToPage(final WebView mainView, final String token, final String error, final int attempt) {
        // Escape for embedding inside a JS string literal
        String safeToken = token == null ? "" : token.replace("\\", "\\\\").replace("'", "\\'");
        String safeError = error == null ? "" : error.replace("\\", "\\\\").replace("'", "\\'");
        final String js = "(function(){if(!window.__eoToken)return 'missing';window.__eoToken(" +
                (token != null ? "'" + safeToken + "'" : "null") +
                (error != null ? ", '" + safeError + "'" : "") + ");return 'ok';})()";
        mainView.post(() -> mainView.evaluateJavascript(js, result -> {
            if (result != null && result.contains("missing") && attempt < 8) {
                mainView.postDelayed(() -> sendToPage(mainView, token, error, attempt + 1), 2000);
            }
        }));
    }
}

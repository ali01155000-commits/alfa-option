package com.alfa.option;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.alfa.option.plugins.EOAutoLoginPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Native auto-login: opens Expert Option in WebView, auto-fills
        // credentials and captures the ssid cookie.
        registerPlugin(EOAutoLoginPlugin.class);
    }
}

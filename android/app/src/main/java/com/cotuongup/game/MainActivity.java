package com.cotuongup.game;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import androidx.activity.EdgeToEdge;
import androidx.core.graphics.Insets;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);
        EdgeToEdge.enable(this);
        registerPlugin(NativeEnginePlugin.class);
        registerPlugin(PremiumBillingPlugin.class);
        super.onCreate(savedInstanceState);
        int background = Color.rgb(18, 18, 20);
        getWindow().getDecorView().setBackgroundColor(background);
        getBridge().getWebView().setBackgroundColor(background);
        View content = findViewById(android.R.id.content);
        // Own insets natively so older/newer Android WebViews behave consistently.
        // SystemBars inset injection is disabled in capacitor.config.ts to avoid double padding.
        ViewCompat.setOnApplyWindowInsetsListener(content, (view, windowInsets) -> {
            Insets bars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            Insets keyboard = windowInsets.getInsets(WindowInsetsCompat.Type.ime());
            view.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, keyboard.bottom));
            return WindowInsetsCompat.CONSUMED;
        });
        ViewCompat.requestApplyInsets(content);
    }
}

package com.proxiservices.app;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Force le contenu à rester SOUS la status bar (pas edge-to-edge)
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
    }
}

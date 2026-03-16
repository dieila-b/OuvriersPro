package com.proxiservices.app;

import android.os.Bundle;
<<<<<<< Updated upstream

import androidx.core.view.WindowCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    // Important: désactive le dessin edge-to-edge derrière les system bars
    WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
  }
}
=======
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
    }
}
>>>>>>> Stashed changes

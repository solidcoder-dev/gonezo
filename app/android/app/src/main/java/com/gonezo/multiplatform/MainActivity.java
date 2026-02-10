package com.gonezo.multiplatform;

import com.getcapacitor.BridgeActivity;
import com.gonezo.multiplatform.plugins.CorePlugin;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(android.os.Bundle savedInstanceState) {
    registerPlugin(CorePlugin.class);
    super.onCreate(savedInstanceState);
  }
}

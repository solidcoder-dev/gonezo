package com.gonezo.multiplatform;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import java.util.ArrayList;
import com.gonezo.multiplatform.plugins.CorePlugin;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(android.os.Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    ArrayList<Class<? extends Plugin>> plugins = new ArrayList<>();
    plugins.add(CorePlugin.class);

    this.init(savedInstanceState, plugins);
  }
}

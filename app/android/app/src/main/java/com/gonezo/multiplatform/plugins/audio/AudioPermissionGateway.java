package com.gonezo.multiplatform.plugins.audio;

import android.content.Context;
import android.Manifest;
import androidx.core.app.ActivityCompat;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;

final class AudioPermissionGateway {
  private static final String PREFERENCES_NAME = "audio-capture-plugin";
  private static final String MICROPHONE_REQUESTED_KEY = "microphone_requested";

  private final Plugin plugin;

  AudioPermissionGateway(Plugin plugin) {
    this.plugin = plugin;
  }

  boolean isGranted() {
    return plugin.getPermissionState("microphone") == PermissionState.GRANTED;
  }

  String getStatus() {
    return resolveStatus(isGranted(), wasRequestedBefore(), isPermanentlyDenied());
  }

  void markRequested() {
    plugin
      .getContext()
      .getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
      .edit()
      .putBoolean(MICROPHONE_REQUESTED_KEY, true)
      .apply();
  }

  boolean isPermanentlyDenied() {
    return plugin.getActivity() != null
      && !ActivityCompat.shouldShowRequestPermissionRationale(plugin.getActivity(), Manifest.permission.RECORD_AUDIO);
  }

  private boolean wasRequestedBefore() {
    return plugin
      .getContext()
      .getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
      .getBoolean(MICROPHONE_REQUESTED_KEY, false);
  }

  static String resolveStatus(boolean granted, boolean requestedBefore, boolean permanentlyDenied) {
    if (granted) {
      return "granted";
    }
    if (!requestedBefore) {
      return "prompt";
    }
    if (permanentlyDenied) {
      return "permanently-denied";
    }
    return "denied";
  }
}

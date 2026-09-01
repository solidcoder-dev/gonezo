package com.gonezo.multiplatform.plugins;

import android.content.Context;
import android.util.Log;
import com.getcapacitor.PluginCall;

final class ApplicationBackupPluginHandler {
  private final Context context;

  ApplicationBackupPluginHandler(Context context) {
    this.context = context;
  }

  void exportBackup(PluginCall call) {
    try {
      Log.i("GonezoBackup", "application export started");
      call.resolve(new ApplicationBackupHandler(context).exportBackup());
      Log.i("GonezoBackup", "application export completed");
    } catch (Exception error) {
      Log.e("GonezoBackup", "application export failed", error);
      call.reject(error.getMessage());
    }
  }

  void importBackup(PluginCall call) {
    String fileBase64 = call.getString("fileBase64");
    if (fileBase64 == null || fileBase64.trim().isEmpty()) {
      call.reject("fileBase64 is required");
      return;
    }
    try {
      Log.i("GonezoBackup", "application import started");
      new ApplicationBackupHandler(context).importBase64(fileBase64);
      call.resolve();
      Log.i("GonezoBackup", "application import completed");
    } catch (Exception error) {
      Log.e("GonezoBackup", "application import failed", error);
      call.reject(error.getMessage());
    }
  }
}

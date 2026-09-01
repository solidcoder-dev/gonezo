package com.gonezo.multiplatform.plugins;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import com.getcapacitor.JSObject;
import com.gonezo.multiplatform.core.AndroidApplicationBackupCore;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import org.json.JSONObject;

final class ApplicationBackupHandler {
  private final Context context;

  ApplicationBackupHandler(Context context) {
    this.context = context;
  }

  JSObject exportBackup() throws Exception {
    String json = AndroidApplicationBackupCore.getInstance(context).exportJson();
    String createdAt = new JSONObject(json).getString("createdAt");
    String fileName = "gonezo-application-backup-" + createdAt.replace(":", "-").replaceAll("\\.\\d{3}Z$", "Z") + ".json";
    JSObject result = new JSObject();
    result.put("fileName", fileName);
    result.put("createdAt", createdAt);
    result.put("json", json);
    result.put("savedTo", writeBackupFile(fileName, json));
    return result;
  }

  void importBase64(String fileBase64) throws Exception {
    String json = new String(Base64.getDecoder().decode(fileBase64), StandardCharsets.UTF_8);
    AndroidApplicationBackupCore.getInstance(context).importJson(json);
  }

  private String writeBackupFile(String fileName, String json) throws Exception {
    byte[] payload = json.getBytes(StandardCharsets.UTF_8);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      ContentValues values = new ContentValues();
      values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
      values.put(MediaStore.MediaColumns.MIME_TYPE, "application/json");
      values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Gonezo/Backups");
      values.put(MediaStore.MediaColumns.IS_PENDING, 1);
      ContentResolver resolver = context.getContentResolver();
      Uri uri = resolver.insert(MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY), values);
      if (uri == null) throw new IllegalStateException("Unable to create backup file");
      try (java.io.OutputStream stream = resolver.openOutputStream(uri)) {
        if (stream == null) throw new IllegalStateException("Unable to open backup file");
        stream.write(payload);
      }
      values.clear();
      values.put(MediaStore.MediaColumns.IS_PENDING, 0);
      resolver.update(uri, values, null, null);
      return "Downloads/Gonezo/Backups/" + fileName;
    }
    File directory = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "Gonezo/Backups");
    if (!directory.exists() && !directory.mkdirs()) throw new IllegalStateException("Unable to create backup directory");
    File file = new File(directory, fileName);
    try (FileOutputStream stream = new FileOutputStream(file)) {
      stream.write(payload);
    }
    return file.getAbsolutePath();
  }
}

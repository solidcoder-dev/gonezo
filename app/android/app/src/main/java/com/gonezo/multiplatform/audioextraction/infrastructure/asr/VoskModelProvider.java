package com.gonezo.multiplatform.audioextraction.infrastructure.asr;

import android.content.Context;
import android.content.res.AssetManager;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import org.vosk.Model;

final class VoskModelProvider {
  private static final String MODEL_CACHE_DIR = "vosk-model-cache";
  private final String modelAssetDir;
  private volatile Model model;

  VoskModelProvider(String modelAssetDir) {
    this.modelAssetDir = modelAssetDir;
  }

  Model getModel(Context context) {
    Model cached = model;
    if (cached != null) {
      return cached;
    }
    synchronized (this) {
      if (model == null) {
        model = loadModel(context.getApplicationContext());
      }
      return model;
    }
  }

  private Model loadModel(Context context) {
    File modelDir = new File(new File(context.getNoBackupFilesDir(), MODEL_CACHE_DIR), modelAssetDir);
    if (!modelDir.exists()) {
      unpackModel(context.getAssets(), modelAssetDir, modelDir);
    }
    if (!modelDir.exists() || !modelDir.isDirectory()) {
      throw new IllegalStateException("Vosk model not available at " + modelDir.getAbsolutePath());
    }
    return new Model(modelDir.getAbsolutePath());
  }

  private void unpackModel(AssetManager assetManager, String assetPath, File targetDir) {
    try {
      String[] children = assetManager.list(assetPath);
      if (children == null || children.length == 0) {
        copyAssetFile(assetManager, assetPath, targetDir);
        return;
      }

      if (!targetDir.exists() && !targetDir.mkdirs()) {
        throw new IOException("Cannot create directory " + targetDir.getAbsolutePath());
      }
      for (String child : children) {
        String childAssetPath = assetPath + "/" + child;
        File childTarget = new File(targetDir, child);
        unpackModel(assetManager, childAssetPath, childTarget);
      }
    } catch (IOException ex) {
      throw new IllegalStateException("Cannot unpack Vosk model assets: " + assetPath, ex);
    }
  }

  private void copyAssetFile(AssetManager assetManager, String assetPath, File outputFile) throws IOException {
    File parent = outputFile.getParentFile();
    if (parent != null && !parent.exists() && !parent.mkdirs()) {
      throw new IOException("Cannot create directory " + parent.getAbsolutePath());
    }
    try (InputStream input = assetManager.open(assetPath); FileOutputStream output = new FileOutputStream(outputFile)) {
      byte[] buffer = new byte[8192];
      int read;
      while ((read = input.read(buffer)) > 0) {
        output.write(buffer, 0, read);
      }
      output.flush();
    }
  }
}

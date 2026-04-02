package com.gonezo.multiplatform.storage;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;
import java.io.File;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;

public final class AndroidObjectStorage implements ObjectStorage {
  private static final String LOG_TAG = "GonezoStorage";
  private static final String PREFERENCES_NAME = "gonezo_storage";
  private static final String SECRET_KEY = "signed_url_secret";
  private final LocalStorageRepository repository;
  private final SignedUrlSigner signer;
  private final Context appContext;
  private LocalStorageHttpServer server;

  public AndroidObjectStorage(Context context) {
    this.appContext = context.getApplicationContext();
    File storageRoot = new File(this.appContext.getFilesDir(), "storage");
    this.repository = new LocalStorageRepository(storageRoot);
    this.signer = new SignedUrlSigner(loadOrCreateSecret(this.appContext));
  }

  @Override
  public synchronized void put(StorageRef ref, byte[] content, StorageMetadata metadata) {
    repository.put(ref, content, metadata);
  }

  @Override
  public synchronized SignedAccessLink getSignedAccess(StorageRef ref, long ttlSeconds) {
    ensureServerStarted();
    long now = Instant.now().getEpochSecond();
    long normalizedTtl = Math.max(30L, Math.min(3600L, ttlSeconds));
    long expiresAt = now + normalizedTtl;
    String path = LocalStorageHttpServer.encodePath(ref);
    String signature = signer.sign("GET", path, expiresAt);
    String url = "https://127.0.0.1:" + server.getListeningPort() + path + "?exp=" + expiresAt + "&sig=" + signature;
    Log.i(
      LOG_TAG,
      "storage_signed_url_generated namespace=" + ref.namespace()
        + " path=" + ref.path()
        + " host=127.0.0.1"
        + " port=" + server.getListeningPort()
        + " expiresAt=" + Instant.ofEpochSecond(expiresAt)
    );
    return new SignedAccessLink(url, Instant.ofEpochSecond(expiresAt).toString());
  }

  @Override
  public synchronized void delete(StorageRef ref) {
    repository.delete(ref);
  }

  private void ensureServerStarted() {
    if (server != null && server.isAlive()) {
      return;
    }
    try {
      server = new LocalStorageHttpServer(0, repository, signer);
      server.makeSecure(LoopbackTlsIdentity.createServerSocketFactory(appContext), null);
      server.start(NanoHttpdReadTimeout.MILLISECONDS_30_SECONDS, true);
      Log.i(
        LOG_TAG,
        "storage_http_server_started host=127.0.0.1 port=" + server.getListeningPort() + " tls=true"
      );
    } catch (Exception ex) {
      Log.e(LOG_TAG, "storage_http_server_start_failed", ex);
      throw new IllegalStateException("Cannot start local storage HTTP server", ex);
    }
  }

  private byte[] loadOrCreateSecret(Context context) {
    SharedPreferences prefs = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE);
    String encoded = prefs.getString(SECRET_KEY, null);
    if (encoded != null && !encoded.isBlank()) {
      try {
        return Base64.getDecoder().decode(encoded);
      } catch (IllegalArgumentException ex) {
        Log.w(LOG_TAG, "Invalid stored signed URL secret; rotating", ex);
      }
    }

    byte[] generated = UUID.randomUUID().toString().replace("-", "").getBytes();
    prefs.edit().putString(SECRET_KEY, Base64.getEncoder().encodeToString(generated)).apply();
    return generated;
  }

  private static final class NanoHttpdReadTimeout {
    private static final int MILLISECONDS_30_SECONDS = 30_000;
  }
}

package com.gonezo.multiplatform.storage;

import static org.junit.Assert.assertEquals;

import fi.iki.elonen.NanoHTTPD;
import java.io.File;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.time.Instant;
import org.junit.Test;

public class LocalStorageHttpServerTest {
  @Test
  public void get_with_valid_signature_downloads_object() throws Exception {
    File root = Files.createTempDirectory("gonezo-storage-http").toFile();
    LocalStorageRepository repository = new LocalStorageRepository(root);
    StorageRef ref = new StorageRef("voice-recordings", "sample.m4a");
    repository.put(ref, "payload".getBytes(StandardCharsets.UTF_8), new StorageMetadata("audio/mp4", "sample.m4a", Instant.now().toString()));
    SignedUrlSigner signer = new SignedUrlSigner("secret".getBytes(StandardCharsets.UTF_8));
    LocalStorageHttpServer server = new LocalStorageHttpServer(0, repository, signer);
    server.start(30_000, true);

    try {
      long expiry = Instant.now().getEpochSecond() + 120;
      String resourcePath = LocalStorageHttpServer.encodePath(ref);
      String sig = signer.sign("GET", resourcePath, expiry);
      URL url = new URL("http://127.0.0.1:" + server.getListeningPort() + resourcePath + "?exp=" + expiry + "&sig=" + sig);
      HttpURLConnection connection = (HttpURLConnection) url.openConnection();
      connection.setRequestMethod("GET");
      assertEquals(200, connection.getResponseCode());
      try (InputStream input = connection.getInputStream()) {
        String body = readUtf8(input);
        assertEquals("payload", body);
      }
      assertEquals("audio/mp4", connection.getHeaderField("Content-Type"));
    } finally {
      server.stop();
    }
  }

  @Test
  public void get_with_invalid_signature_returns_forbidden() throws Exception {
    File root = Files.createTempDirectory("gonezo-storage-http-invalid").toFile();
    LocalStorageRepository repository = new LocalStorageRepository(root);
    StorageRef ref = new StorageRef("voice-recordings", "sample.m4a");
    repository.put(ref, "payload".getBytes(StandardCharsets.UTF_8), new StorageMetadata("audio/mp4", "sample.m4a", Instant.now().toString()));
    SignedUrlSigner signer = new SignedUrlSigner("secret".getBytes(StandardCharsets.UTF_8));
    LocalStorageHttpServer server = new LocalStorageHttpServer(0, repository, signer);
    server.start(NanoHTTPD.SOCKET_READ_TIMEOUT, true);

    try {
      long expiry = Instant.now().getEpochSecond() + 120;
      String resourcePath = LocalStorageHttpServer.encodePath(ref);
      URL url = new URL("http://127.0.0.1:" + server.getListeningPort() + resourcePath + "?exp=" + expiry + "&sig=bad");
      HttpURLConnection connection = (HttpURLConnection) url.openConnection();
      connection.setRequestMethod("GET");
      assertEquals(403, connection.getResponseCode());
    } finally {
      server.stop();
    }
  }

  private String readUtf8(InputStream input) throws Exception {
    ByteArrayOutputStream output = new ByteArrayOutputStream();
    byte[] buffer = new byte[1024];
    int read;
    while ((read = input.read(buffer)) > 0) {
      output.write(buffer, 0, read);
    }
    return new String(output.toByteArray(), StandardCharsets.UTF_8);
  }
}

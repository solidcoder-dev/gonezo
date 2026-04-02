package com.gonezo.multiplatform.storage;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertThrows;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.time.Instant;
import org.junit.Test;

public class LocalStorageRepositoryTest {
  @Test
  public void put_and_get_roundtrip_content_and_metadata() throws Exception {
    File root = Files.createTempDirectory("gonezo-storage-test").toFile();
    LocalStorageRepository repository = new LocalStorageRepository(root);

    StorageRef ref = new StorageRef("voice-recordings", "session-1.m4a");
    StorageMetadata metadata = new StorageMetadata("audio/mp4", "session-1.m4a", Instant.now().toString());
    repository.put(ref, "hello".getBytes(), metadata);

    StoredObject storedObject = repository.get(ref);
    assertNotNull(storedObject);
    assertEquals("audio/mp4", storedObject.metadata().contentType());
    assertEquals("session-1.m4a", storedObject.metadata().filename());
    assertEquals("hello", new String(Files.readAllBytes(storedObject.file().toPath()), StandardCharsets.UTF_8));
  }

  @Test
  public void delete_removes_object_and_metadata() throws Exception {
    File root = Files.createTempDirectory("gonezo-storage-test-delete").toFile();
    LocalStorageRepository repository = new LocalStorageRepository(root);
    StorageRef ref = new StorageRef("voice-recordings", "session-2.m4a");
    repository.put(ref, "bye".getBytes(), new StorageMetadata("audio/mp4", "session-2.m4a", Instant.now().toString()));

    repository.delete(ref);

    assertNull(repository.get(ref));
  }

  @Test
  public void put_rejects_path_traversal() throws Exception {
    File root = Files.createTempDirectory("gonezo-storage-test-invalid").toFile();
    LocalStorageRepository repository = new LocalStorageRepository(root);

    assertThrows(IllegalArgumentException.class, () ->
      repository.put(
        new StorageRef("voice-recordings", "../escape.m4a"),
        "x".getBytes(),
        new StorageMetadata("audio/mp4", "escape.m4a", Instant.now().toString())
      )
    );
  }
}

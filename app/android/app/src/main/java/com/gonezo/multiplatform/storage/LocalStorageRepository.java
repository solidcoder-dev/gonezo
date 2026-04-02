package com.gonezo.multiplatform.storage;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.regex.Pattern;
import org.json.JSONObject;

final class LocalStorageRepository {
  private static final Pattern NAMESPACE_PATTERN = Pattern.compile("^[A-Za-z0-9._-]{1,64}$");
  private static final Pattern PATH_SEGMENT_PATTERN = Pattern.compile("^[A-Za-z0-9._-]{1,128}$");
  private final File rootDir;
  private final String rootCanonical;

  LocalStorageRepository(File rootDir) {
    this.rootDir = rootDir;
    if (!rootDir.exists() && !rootDir.mkdirs()) {
      throw new IllegalStateException("Cannot initialize storage directory: " + rootDir.getAbsolutePath());
    }
    try {
      this.rootCanonical = rootDir.getCanonicalPath();
    } catch (IOException ex) {
      throw new IllegalStateException("Cannot resolve storage root path", ex);
    }
  }

  synchronized void put(StorageRef ref, byte[] content, StorageMetadata metadata) {
    if (content == null || content.length == 0) {
      throw new IllegalArgumentException("content is required");
    }
    validateRef(ref);
    StoragePath storagePath = resolveStoragePath(ref);
    ensureParent(storagePath.objectFile().getParentFile());
    try (FileOutputStream output = new FileOutputStream(storagePath.objectFile())) {
      output.write(content);
      output.flush();
    } catch (IOException ex) {
      throw new IllegalStateException("Cannot write storage object " + ref, ex);
    }
    writeMetadata(storagePath.metadataFile(), metadata);
  }

  synchronized StoredObject get(StorageRef ref) {
    validateRef(ref);
    StoragePath storagePath = resolveStoragePath(ref);
    if (!storagePath.objectFile().exists() || !storagePath.objectFile().isFile()) {
      return null;
    }
    StorageMetadata metadata = readMetadata(storagePath.metadataFile());
    return new StoredObject(storagePath.objectFile(), metadata);
  }

  synchronized void delete(StorageRef ref) {
    validateRef(ref);
    StoragePath storagePath = resolveStoragePath(ref);
    if (storagePath.objectFile().exists() && !storagePath.objectFile().delete()) {
      throw new IllegalStateException("Cannot delete object " + ref);
    }
    if (storagePath.metadataFile().exists() && !storagePath.metadataFile().delete()) {
      throw new IllegalStateException("Cannot delete metadata " + ref);
    }
  }

  private StorageMetadata readMetadata(File metadataFile) {
    if (!metadataFile.exists() || !metadataFile.isFile()) {
      return new StorageMetadata("application/octet-stream", "", "");
    }
    try {
      String text = new String(Files.readAllBytes(metadataFile.toPath()), StandardCharsets.UTF_8);
      JSONObject json = new JSONObject(text);
      String contentType = json.optString("contentType", "application/octet-stream");
      String filename = json.optString("filename", "");
      String createdAt = json.optString("createdAt", "");
      return new StorageMetadata(contentType, filename, createdAt);
    } catch (Exception ex) {
      return new StorageMetadata("application/octet-stream", "", "");
    }
  }

  private void writeMetadata(File metadataFile, StorageMetadata metadata) {
    JSONObject json = new JSONObject();
    try {
      json.put("contentType", metadata == null ? "application/octet-stream" : metadata.contentType());
      json.put("filename", metadata == null ? "" : metadata.filename());
      json.put("createdAt", metadata == null ? "" : metadata.createdAt());
    } catch (Exception ex) {
      throw new IllegalStateException("Cannot serialize object metadata", ex);
    }
    ensureParent(metadataFile.getParentFile());
    try (FileOutputStream output = new FileOutputStream(metadataFile)) {
      output.write(json.toString().getBytes(StandardCharsets.UTF_8));
      output.flush();
    } catch (IOException ex) {
      throw new IllegalStateException("Cannot write object metadata", ex);
    }
  }

  private void validateRef(StorageRef ref) {
    if (ref == null) {
      throw new IllegalArgumentException("storage ref is required");
    }
    if (!NAMESPACE_PATTERN.matcher(ref.namespace()).matches()) {
      throw new IllegalArgumentException("Invalid namespace");
    }
    String[] segments = ref.path().split("/");
    if (segments.length == 0) {
      throw new IllegalArgumentException("Invalid path");
    }
    for (String segment : segments) {
      if (!PATH_SEGMENT_PATTERN.matcher(segment).matches() || ".".equals(segment) || "..".equals(segment)) {
        throw new IllegalArgumentException("Invalid path segment");
      }
    }
  }

  private StoragePath resolveStoragePath(StorageRef ref) {
    File current = new File(rootDir, ref.namespace());
    String[] segments = ref.path().split("/");
    for (String segment : segments) {
      current = new File(current, segment);
    }
    File metadataFile = new File(current.getAbsolutePath() + ".meta.json");
    try {
      String objectCanonical = current.getCanonicalPath();
      String metadataCanonical = metadataFile.getCanonicalPath();
      if (!objectCanonical.startsWith(rootCanonical + File.separator) || !metadataCanonical.startsWith(rootCanonical + File.separator)) {
        throw new IllegalArgumentException("Storage path escapes root");
      }
    } catch (IOException ex) {
      throw new IllegalStateException("Cannot resolve storage path", ex);
    }
    return new StoragePath(current, metadataFile);
  }

  private void ensureParent(File parent) {
    if (parent != null && !parent.exists() && !parent.mkdirs()) {
      throw new IllegalStateException("Cannot create storage directory " + parent.getAbsolutePath());
    }
  }

  private record StoragePath(File objectFile, File metadataFile) {
  }
}

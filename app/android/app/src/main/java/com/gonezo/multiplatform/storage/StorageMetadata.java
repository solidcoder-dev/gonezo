package com.gonezo.multiplatform.storage;

public final class StorageMetadata {
  private final String contentType;
  private final String filename;
  private final String createdAt;

  public StorageMetadata(String contentType, String filename, String createdAt) {
    this.contentType = contentType == null ? "" : contentType.trim();
    this.filename = filename == null ? "" : filename.trim();
    this.createdAt = createdAt == null ? "" : createdAt.trim();
  }

  public String contentType() {
    return contentType;
  }

  public String filename() {
    return filename;
  }

  public String createdAt() {
    return createdAt;
  }
}

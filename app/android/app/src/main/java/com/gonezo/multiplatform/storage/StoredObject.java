package com.gonezo.multiplatform.storage;

import java.io.File;

final class StoredObject {
  private final File file;
  private final StorageMetadata metadata;

  StoredObject(File file, StorageMetadata metadata) {
    this.file = file;
    this.metadata = metadata;
  }

  File file() {
    return file;
  }

  StorageMetadata metadata() {
    return metadata;
  }
}

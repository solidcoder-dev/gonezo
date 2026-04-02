package com.gonezo.multiplatform.storage;

import java.util.Objects;

public final class StorageRef {
  private final String namespace;
  private final String path;

  public StorageRef(String namespace, String path) {
    this.namespace = namespace == null ? "" : namespace.trim();
    this.path = path == null ? "" : path.trim();
  }

  public String namespace() {
    return namespace;
  }

  public String path() {
    return path;
  }

  @Override
  public String toString() {
    return "StorageRef{namespace='" + namespace + "', path='" + path + "'}";
  }

  @Override
  public boolean equals(Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof StorageRef ref)) {
      return false;
    }
    return namespace.equals(ref.namespace) && path.equals(ref.path);
  }

  @Override
  public int hashCode() {
    return Objects.hash(namespace, path);
  }
}

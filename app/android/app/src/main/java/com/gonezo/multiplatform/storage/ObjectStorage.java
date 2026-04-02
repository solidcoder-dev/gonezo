package com.gonezo.multiplatform.storage;

public interface ObjectStorage {
  void put(StorageRef ref, byte[] content, StorageMetadata metadata);

  SignedAccessLink getSignedAccess(StorageRef ref, long ttlSeconds);

  void delete(StorageRef ref);
}

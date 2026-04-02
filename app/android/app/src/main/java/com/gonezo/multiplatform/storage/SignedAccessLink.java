package com.gonezo.multiplatform.storage;

public final class SignedAccessLink {
  private final String url;
  private final String expiresAt;

  public SignedAccessLink(String url, String expiresAt) {
    this.url = url;
    this.expiresAt = expiresAt;
  }

  public String url() {
    return url;
  }

  public String expiresAt() {
    return expiresAt;
  }
}

package com.gonezo.multiplatform.plugins.audio;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class AudioPermissionGatewayTest {
  @Test
  public void resolvesGrantedBeforeOtherStates() {
    assertEquals("granted", AudioPermissionGateway.resolveStatus(true, false, false));
  }

  @Test
  public void resolvesPromptBeforeFirstRequest() {
    assertEquals("prompt", AudioPermissionGateway.resolveStatus(false, false, false));
  }

  @Test
  public void resolvesDeniedAfterARegularRejection() {
    assertEquals("denied", AudioPermissionGateway.resolveStatus(false, true, false));
  }

  @Test
  public void resolvesPermanentlyDeniedAfterDontAskAgain() {
    assertEquals("permanently-denied", AudioPermissionGateway.resolveStatus(false, true, true));
  }
}

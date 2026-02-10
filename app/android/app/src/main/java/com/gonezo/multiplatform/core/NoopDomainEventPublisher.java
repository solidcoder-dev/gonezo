package com.gonezo.multiplatform.core;

import com.gonezo.application.events.DomainEventPublisher;

final class NoopDomainEventPublisher implements DomainEventPublisher {
  @Override
  public void publish(Object event) {
    // no-op
  }
}

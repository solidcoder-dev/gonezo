package com.gonezo.multiplatform.core;

import com.gonezo.application.events.DomainEventPublisher;
import com.gonezo.domain.shared.DomainEvent;

final class NoopDomainEventPublisher implements DomainEventPublisher {
  @Override
  public void publish(DomainEvent event) {
    // no-op
  }
}

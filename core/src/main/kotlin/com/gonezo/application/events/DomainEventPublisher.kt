package com.gonezo.application.events

import com.gonezo.domain.shared.DomainEvent

interface DomainEventPublisher {
  fun publish(event: DomainEvent)
}

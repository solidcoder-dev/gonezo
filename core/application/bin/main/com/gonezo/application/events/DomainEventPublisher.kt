package com.gonezo.application.events

interface DomainEventPublisher {
  fun publish(event: Any)
}

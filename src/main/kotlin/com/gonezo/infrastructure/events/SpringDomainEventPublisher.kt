package com.gonezo.infrastructure.events

import com.gonezo.application.events.DomainEventPublisher
import org.springframework.context.ApplicationEventPublisher
import org.springframework.stereotype.Component

@Component
class SpringDomainEventPublisher(
  private val publisher: ApplicationEventPublisher,
) : DomainEventPublisher {

  override fun publish(event: Any) {
    publisher.publishEvent(event)
  }
}

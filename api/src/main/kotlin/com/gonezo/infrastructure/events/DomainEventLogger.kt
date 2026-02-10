package com.gonezo.infrastructure.events

import org.slf4j.LoggerFactory
import org.springframework.context.event.EventListener
import org.springframework.stereotype.Component

@Component
class DomainEventLogger {
  private val logger = LoggerFactory.getLogger(DomainEventLogger::class.java)

  @EventListener
  fun onDomainEvent(event: Any) {
    val name = event::class.java.name
    if (name.contains(".domain.") && name.contains(".events.")) {
      logger.info("Domain event published: {}", event)
    }
  }
}

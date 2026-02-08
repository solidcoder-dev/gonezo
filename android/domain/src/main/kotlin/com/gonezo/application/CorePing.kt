package com.gonezo.application

import java.time.Instant

object CorePing {
  @JvmStatic
  fun doThing(input: String): String {
    val normalized = if (input.isBlank()) "ping" else input.trim()
    return "domain ok: $normalized @ ${Instant.now()}"
  }
}

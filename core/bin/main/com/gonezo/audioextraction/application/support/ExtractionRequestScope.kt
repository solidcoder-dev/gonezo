package com.gonezo.audioextraction.application.support

object ExtractionRequestScope {
  private val requestIdLocal = ThreadLocal<String?>()

  fun currentRequestId(): String? = requestIdLocal.get()

  fun <T> withRequestId(requestId: String, block: () -> T): T {
    val previous = requestIdLocal.get()
    requestIdLocal.set(requestId)
    return try {
      block()
    } finally {
      if (previous == null) {
        requestIdLocal.remove()
      } else {
        requestIdLocal.set(previous)
      }
    }
  }
}

package com.gonezo.application

interface ConsistencyBoundary {
  fun <T> withinConsistencyBoundary(block: () -> T): T
}

object ImmediateConsistencyBoundary : ConsistencyBoundary {
  override fun <T> withinConsistencyBoundary(block: () -> T): T = block()
}

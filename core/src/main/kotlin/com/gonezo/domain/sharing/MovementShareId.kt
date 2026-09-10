package com.gonezo.sharing.domain

import java.util.UUID

data class MovementShareId(val value: UUID) {
    companion object {
        fun random(): MovementShareId = MovementShareId(UUID.randomUUID())

        fun from(raw: String): MovementShareId = MovementShareId(UUID.fromString(raw))
    }

    override fun toString(): String = value.toString()
}

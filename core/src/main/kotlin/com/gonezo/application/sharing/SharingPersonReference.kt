package com.gonezo.sharing.application

sealed interface SharingPersonReference {
    data class Existing(val personId: String) : SharingPersonReference {
        init {
            require(personId.isNotBlank()) { "Existing sharing person requires an id" }
        }
    }

    data class New(val displayName: String) : SharingPersonReference {
        init {
            require(displayName.isNotBlank()) { "New sharing person requires a display name" }
        }
    }
}

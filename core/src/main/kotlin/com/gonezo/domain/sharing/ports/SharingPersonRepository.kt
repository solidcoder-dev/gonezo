package com.gonezo.sharing.domain.ports

import com.gonezo.sharing.domain.SharingPerson
import com.gonezo.sharing.domain.SharingPersonId

interface SharingPersonRepository {
  fun save(person: SharingPerson)

  fun findById(id: SharingPersonId): SharingPerson? = listActive().firstOrNull { it.id == id }

  fun findByNormalizedName(normalizedName: String): SharingPerson?

  fun listActive(): List<SharingPerson>
}

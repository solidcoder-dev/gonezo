package com.gonezo.sharing.domain.ports

import com.gonezo.sharing.domain.SharingPerson

interface SharingPersonRepository {
  fun save(person: SharingPerson)

  fun findByNormalizedName(normalizedName: String): SharingPerson?

  fun listActive(): List<SharingPerson>
}

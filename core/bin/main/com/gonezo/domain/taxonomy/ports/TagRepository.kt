package com.gonezo.taxonomy.domain.ports

import com.gonezo.taxonomy.domain.Tag
import com.gonezo.taxonomy.domain.TagId

interface TagRepository {
  fun save(tag: Tag)

  fun findById(id: TagId): Tag?

  fun findByIds(ids: Collection<TagId>): Map<TagId, Tag>

  fun findByNormalizedName(name: String): Tag?

  fun listAll(): List<Tag>
}

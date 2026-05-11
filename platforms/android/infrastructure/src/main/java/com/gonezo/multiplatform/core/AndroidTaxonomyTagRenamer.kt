package com.gonezo.multiplatform.core

import com.gonezo.taxonomy.application.RenameTagCommand
import com.gonezo.taxonomy.application.RenameTagService
import com.gonezo.taxonomy.application.RenameTagUC
import com.gonezo.taxonomy.domain.TagId
import com.gonezo.taxonomy.domain.ports.TagRepository

class AndroidTaxonomyTagRenamer(
  tagRepository: TagRepository,
) {
  private val renameTagUC: RenameTagUC = RenameTagService(tagRepository)

  fun rename(tagId: String, name: String) {
    renameTagUC.execute(
      RenameTagCommand(
        tagId = TagId.from(tagId),
        name = name,
      ),
    )
  }
}

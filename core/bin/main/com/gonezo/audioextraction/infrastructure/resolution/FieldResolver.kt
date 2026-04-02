package com.gonezo.audioextraction.infrastructure.resolution

import com.gonezo.audioextraction.domain.model.FieldCandidate
import com.gonezo.audioextraction.domain.model.ResolvedField
import com.gonezo.audioextraction.domain.schema.FieldSchema

interface FieldResolver {
  fun supports(schema: FieldSchema): Boolean
  fun resolve(fieldName: String, schema: FieldSchema, candidates: List<FieldCandidate>): ResolvedField
}

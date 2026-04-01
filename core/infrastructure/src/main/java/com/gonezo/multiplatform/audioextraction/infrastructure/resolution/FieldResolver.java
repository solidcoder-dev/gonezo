package com.gonezo.multiplatform.audioextraction.infrastructure.resolution;

import com.gonezo.multiplatform.audioextraction.domain.model.FieldCandidate;
import com.gonezo.multiplatform.audioextraction.domain.model.ResolvedField;
import com.gonezo.multiplatform.audioextraction.domain.schema.FieldSchema;
import java.util.List;

interface FieldResolver {
  boolean supports(FieldSchema schema);

  ResolvedField resolve(String fieldName, FieldSchema schema, List<FieldCandidate> candidates);
}

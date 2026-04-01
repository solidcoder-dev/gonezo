package com.gonezo.multiplatform.audioextraction.domain.schema;

import java.util.List;

public record FieldSchema(String type, String format, List<String> enumValues, boolean required) {
  public FieldSchema {
    if (enumValues == null) {
      enumValues = List.of();
    }
  }
}

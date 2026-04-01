package com.gonezo.multiplatform.audioextraction.infrastructure.llm;

import com.gonezo.multiplatform.audioextraction.domain.model.FieldCandidate;
import java.util.List;
import java.util.Map;

public interface OutputParser {
  Map<String, List<FieldCandidate>> parse(String output);
}

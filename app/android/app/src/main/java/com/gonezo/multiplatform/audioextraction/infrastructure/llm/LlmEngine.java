package com.gonezo.multiplatform.audioextraction.infrastructure.llm;

public interface LlmEngine {
  String infer(String prompt);
}

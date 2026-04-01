package com.gonezo.multiplatform.audioextraction.infrastructure.llm;

public record LlmConfig(int maxTokens, int maxInputChars, long timeoutMs) {}

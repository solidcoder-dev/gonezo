package com.gonezo.audioextraction.infrastructure.llm

import com.gonezo.audioextraction.domain.model.ExecutionPlan
import com.gonezo.audioextraction.domain.model.Transcript
import com.gonezo.audioextraction.domain.schema.OutputSchema

interface PromptBuilder {
  fun build(transcript: Transcript, schema: OutputSchema, plan: ExecutionPlan): String
}

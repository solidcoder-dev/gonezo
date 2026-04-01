package com.gonezo.multiplatform.audioextraction.domain.model;

import java.util.List;

public record Transcript(String text, List<Segment> segments) {
  public Transcript {
    if (segments == null) {
      segments = List.of();
    }
  }
}

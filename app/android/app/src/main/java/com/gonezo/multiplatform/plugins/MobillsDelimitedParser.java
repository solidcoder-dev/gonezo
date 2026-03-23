package com.gonezo.multiplatform.plugins;

import java.util.ArrayList;
import java.util.List;

final class MobillsDelimitedParser {

  private MobillsDelimitedParser() {
    throw new IllegalStateException("Utility class");
  }

  static char detectDelimiter(String headerLine) {
    int tabs = countDelimiterOutsideQuotes(headerLine, '\t');
    int commas = countDelimiterOutsideQuotes(headerLine, ',');
    return tabs >= commas ? '\t' : ',';
  }

  static List<String> splitDelimited(String line, char delimiter) {
    List<String> cells = new ArrayList<>();
    if (line == null) {
      cells.add("");
      return cells;
    }

    StringBuilder current = new StringBuilder();
    boolean inQuotes = false;

    for (int index = 0; index < line.length(); index++) {
      char character = line.charAt(index);
      if (character == '"') {
        boolean escapedQuote = inQuotes && index + 1 < line.length() && line.charAt(index + 1) == '"';
        if (escapedQuote) {
          current.append('"');
          index += 1;
          continue;
        }
        inQuotes = !inQuotes;
        continue;
      }
      if (character == delimiter && !inQuotes) {
        cells.add(current.toString());
        current.setLength(0);
        continue;
      }
      current.append(character);
    }
    cells.add(current.toString());
    return cells;
  }

  private static int countDelimiterOutsideQuotes(String line, char delimiter) {
    if (line == null || line.isEmpty()) {
      return 0;
    }

    int count = 0;
    boolean inQuotes = false;

    for (int index = 0; index < line.length(); index++) {
      char character = line.charAt(index);
      if (character == '"') {
        boolean escapedQuote = inQuotes && index + 1 < line.length() && line.charAt(index + 1) == '"';
        if (escapedQuote) {
          index += 1;
          continue;
        }
        inQuotes = !inQuotes;
        continue;
      }
      if (character == delimiter && !inQuotes) {
        count += 1;
      }
    }

    return count;
  }
}

package com.gonezo.multiplatform.plugins;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import java.util.Arrays;
import java.util.List;
import org.junit.Test;

public class MobillsDelimitedParserTest {

  @Test
  public void detectsCommaDelimiterForCsvHeader() {
    char delimiter = MobillsDelimitedParser.detectDelimiter("date,account,value,currency");
    assertEquals(',', delimiter);
  }

  @Test
  public void detectsSemicolonDelimiterForMobillsHeader() {
    char delimiter = MobillsDelimitedParser.detectDelimiter("\"Date\";\"Description\";\"Value\";\"Account\"");
    assertEquals(';', delimiter);
  }

  @Test
  public void detectsTabDelimiterForTsvHeader() {
    char delimiter = MobillsDelimitedParser.detectDelimiter("date\taccount\tvalue\tcurrency");
    assertEquals('\t', delimiter);
  }

  @Test
  public void splitsCsvWithQuotedCommasAndEscapedQuotes() {
    List<String> cells = MobillsDelimitedParser.splitDelimited(
      "2026-03-20,\"Cash, Wallet\",-12.50,\"Lunch \"\"team\"\"\"",
      ','
    );

    assertEquals(Arrays.asList("2026-03-20", "Cash, Wallet", "-12.50", "Lunch \"team\""), cells);
  }

  @Test
  public void keepsEmptyTrailingCell() {
    List<String> cells = MobillsDelimitedParser.splitDelimited("a,b,", ',');
    assertEquals(3, cells.size());
    assertTrue(cells.get(2).isEmpty());
  }

  @Test
  public void splitsSemicolonCsvWithQuotedValues() {
    List<String> cells = MobillsDelimitedParser.splitDelimited(
      "\"31/07/2018\";\"Pollo y papas\";\"-8.30\";\"Billetera\";\"Alimentación\";\"\";\"trip;london\"",
      ';'
    );

    assertEquals(
      Arrays.asList("31/07/2018", "Pollo y papas", "-8.30", "Billetera", "Alimentación", "", "trip;london"),
      cells
    );
  }
}

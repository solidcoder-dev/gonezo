package com.gonezo.macroanalytics.ingestion

import com.gonezo.macroanalytics.ingestion.infrastructure.MacroAnalyticsPublicationProtocolDispatcher
import com.gonezo.macroanalytics.ingestion.infrastructure.MacroAnalyticsPublicationWireV3Parser
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFails

class MacroAnalyticsPublicationWireV3Test {
    @Test
    fun `parses canonical V3 fixture and includes recurring in canonical bytes`() {
        val json = File("../../contracts/macro-analytics/fixtures/publication-v3-valid.json").readText()
        val publication = MacroAnalyticsPublicationProtocolDispatcher().parse(json)

        assertEquals(3, publication.protocolVersion.value)
        assertEquals(3, publication.contribution.schemaVersion.value)
        assertEquals(
            "{\"protocolVersion\":3,\"contributorId\":\"opaque-random-id\",\"period\":\"2026-09\",\"revision\":5,\"contribution\":{\"schemaVersion\":3,\"dimensions\":{\"countryCode\":\"ES\",\"regionCode\":\"ES-CN\",\"sex\":\"FEMALE\",\"ageBand\":\"25_34\"},\"financial\":{\"currencies\":[{\"currency\":\"EUR\",\"buckets\":[{\"source\":\"SCHEDULED\",\"kind\":\"EXPENSE\",\"amount\":\"12\",\"count\":1}]}]},\"categories\":{\"currencies\":[{\"currency\":\"EUR\",\"buckets\":[{\"source\":\"SCHEDULED\",\"kind\":\"EXPENSE\",\"category\":\"BILLS\",\"amount\":\"12\"}]}]},\"recurring\":{\"currencies\":[{\"currency\":\"EUR\",\"buckets\":[{\"source\":\"SCHEDULED\",\"kind\":\"EXPENSE\",\"amount\":\"12\",\"occurrenceCount\":1,\"seriesCount\":1}]}]}}}",
            publication.canonicalJson(),
        )
    }

    @Test
    fun `rejects recurring bucket identity duplicates and invalid counts`() {
        val fixture = File("../../contracts/macro-analytics/fixtures/publication-v3-valid.json").readText()
        val parser = MacroAnalyticsPublicationWireV3Parser()
        assertFails { parser.parse(fixture.replace("\"seriesCount\": 1", "\"seriesCount\": 2")) }
        assertFails { parser.parse(fixture.replace("\"seriesCount\": 1", "\"seriesCount\": 1, \"seriesId\": \"private\"")) }
        assertFails { parser.parse(fixture.replace("\"schemaVersion\": 3", "\"schemaVersion\": 2")) }
        assertFails { parser.parse(fixture.replace("\"protocolVersion\": 3", "\"protocolVersion\": 2")) }
        assertFails { parser.parse(fixture.replace("\"amount\": \"12\", \"occurrenceCount\": 1", "\"amount\": \"-1\", \"occurrenceCount\": 1")) }
        assertFails { parser.parse(fixture.replace("\"seriesCount\": 1", "\"seriesCount\": 1}, {\"source\":\"SCHEDULED\",\"kind\":\"EXPENSE\",\"amount\":\"0\",\"occurrenceCount\":1,\"seriesCount\":1")) }
    }
}

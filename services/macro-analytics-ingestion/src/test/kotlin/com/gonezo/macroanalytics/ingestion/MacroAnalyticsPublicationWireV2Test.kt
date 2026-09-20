package com.gonezo.macroanalytics.ingestion

import com.gonezo.macroanalytics.ingestion.infrastructure.MacroAnalyticsPublicationProtocolDispatcher
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class MacroAnalyticsPublicationWireV2Test {
    private val parser = MacroAnalyticsPublicationProtocolDispatcher()

    @Test
    fun `dispatches V2 fixture and canonicalizes category content`() {
        val publication = parser.parse(fixture())

        assertEquals(2, publication.protocolVersion.value)
        assertEquals(2, publication.contribution.schemaVersion.value)
        assertEquals("GROCERIES", publication.contribution.categories?.currencies?.single()?.buckets?.single()?.category)
        assertEquals(
            "{\"protocolVersion\":2,\"contributorId\":\"opaque-random-id\",\"period\":\"2026-09\",\"revision\":4,\"contribution\":{\"schemaVersion\":2,\"dimensions\":{\"countryCode\":\"ES\",\"regionCode\":\"ES-CN\",\"sex\":\"FEMALE\",\"ageBand\":\"25_34\"},\"financial\":{\"currencies\":[{\"currency\":\"EUR\",\"buckets\":[{\"source\":\"POSTED\",\"kind\":\"EXPENSE\",\"amount\":\"12.00\",\"count\":1}]}]},\"categories\":{\"currencies\":[{\"currency\":\"EUR\",\"buckets\":[{\"source\":\"POSTED\",\"kind\":\"EXPENSE\",\"category\":\"GROCERIES\",\"amount\":\"12\"}]}]}}}",
            publication.canonicalJson(),
        )
    }

    @Test
    fun `protocol dispatcher continues to parse V1`() {
        val publication = parser.parse(File("../../contracts/macro-analytics/fixtures/publication-v1-valid.json").readText())
        assertEquals(1, publication.protocolVersion.value)
        assertEquals(1, publication.contribution.schemaVersion.value)
    }

    @Test
    fun `rejects invalid V2 category buckets and version mismatches`() {
        val invalid = listOf(
            fixture().replace("\"protocolVersion\": 2", "\"protocolVersion\": 1"),
            fixture().replace("\"schemaVersion\": 2", "\"schemaVersion\": 1"),
            fixture().replace("\"category\": \"GROCERIES\"", "\"category\": \"private-category-id\""),
            fixture().replace("\"kind\": \"EXPENSE\", \"category\"", "\"kind\": \"TRANSFER_OUT\", \"category\""),
            fixture().replace("\"amount\": \"12\"", "\"amount\": \"0.00\""),
            fixture().replace("\"amount\": \"12\"", "\"amount\": \"12.00\""),
            fixture().replace("\"category\": \"GROCERIES\"", "\"category\": \"GROCERIES\", \"privateCategoryId\": \"secret\""),
            fixture().replace("\"amount\": \"12\"", "\"amount\": \"0\""),
            fixture().replace("\"currency\": \"EUR\"", "\"currency\": \"EUR\"}, {\"currency\": \"EUR\""),
            fixture().replace("\"amount\": \"12\"", "\"amount\": \"12\"}, {\"source\": \"POSTED\", \"kind\": \"EXPENSE\", \"category\": \"GROCERIES\", \"amount\": \"12\""),
        )
        invalid.forEach { payload -> assertFailsWith<IllegalArgumentException> { parser.parse(payload) } }
    }

    private fun fixture() = File("../../contracts/macro-analytics/fixtures/publication-v2-valid.json").readText()
}

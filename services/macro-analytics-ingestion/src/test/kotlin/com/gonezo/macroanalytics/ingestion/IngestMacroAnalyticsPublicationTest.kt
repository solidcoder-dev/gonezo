package com.gonezo.macroanalytics.ingestion

import com.gonezo.macroanalytics.ingestion.application.IngestMacroAnalyticsPublication
import com.gonezo.macroanalytics.ingestion.infrastructure.InMemoryLatestMacroAnalyticsPublicationRepository
import com.gonezo.macroanalytics.ingestion.infrastructure.MacroAnalyticsPublicationWireV1Parser
import com.gonezo.macroanalytics.ingestion.infrastructure.UnsupportedProtocolVersion
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNotEquals

class IngestMacroAnalyticsPublicationTest {
    private val parser = MacroAnalyticsPublicationWireV1Parser()
    private val repository = InMemoryLatestMacroAnalyticsPublicationRepository()
    private val ingest = IngestMacroAnalyticsPublication(repository)

    @Test
    fun `accepts shared fixture and compares canonical payload with client field order`() {
        val wire = File("../../contracts/macro-analytics/fixtures/publication-v1-valid.json").readText()
        val publication = parser.parse(wire)

        assertEquals(1, publication.protocolVersion.value)
        assertEquals("opaque-random-id", publication.contributorId.value)
        assertEquals("2026-09", publication.period.value)
        assertEquals(3, publication.revision.value)
        assertEquals(1, publication.contribution.schemaVersion.value)
        assertEquals(
            "{\"protocolVersion\":1,\"contributorId\":\"opaque-random-id\",\"period\":\"2026-09\",\"revision\":3,\"contribution\":{\"schemaVersion\":1,\"dimensions\":{\"countryCode\":\"ES\",\"regionCode\":\"ES-CN\",\"sex\":\"FEMALE\",\"ageBand\":\"25_34\"},\"financial\":{\"currencies\":[{\"currency\":\"EUR\",\"buckets\":[{\"source\":\"POSTED\",\"kind\":\"EXPENSE\",\"amount\":\"12.00\",\"count\":1}]}]}}}",
            publication.canonicalJson(),
        )
        assertEquals("ACCEPTED", ingest.execute(publication).outcome.name)
    }

    @Test
    fun `accepts empty financial contribution`() {
        val publication = parser.parse(File("../../contracts/macro-analytics/fixtures/publication-v1-empty-financial.json").readText())
        assertEquals(emptyList(), publication.contribution.financial.currencies)
        assertEquals("ACCEPTED", ingest.execute(publication).outcome.name)
    }

    @Test
    fun `updates to higher revisions and retains only the latest`() {
        val first = parser.parse(fixture().replace("\"revision\": 3", "\"revision\": 1"))
        val second = parser.parse(fixture().replace("\"revision\": 3", "\"revision\": 2"))

        assertEquals("ACCEPTED", ingest.execute(first).outcome.name)
        val updateResult = ingest.execute(second)
        assertEquals("UPDATED", updateResult.outcome.name)
        assertEquals(second.revision, updateResult.currentRevision)
        assertEquals(second, repository.find(second.contributorId, second.period))
    }

    @Test
    fun `replays exact revision idempotently`() {
        val publication = parser.parse(fixture())
        ingest.execute(publication)

        val replay = ingest.execute(publication.copy(contribution = publication.contribution.copy()))

        assertEquals("ALREADY_CURRENT", replay.outcome.name)
        assertEquals(publication.revision, replay.currentRevision)
    }

    @Test
    fun `rejects same revision with different payload and retains existing`() {
        val current = parser.parse(fixture())
        val conflicting = parser.parse(fixture().replace("12.00", "13.00"))
        ingest.execute(current)

        val result = ingest.execute(conflicting)

        assertEquals("REVISION_CONFLICT", result.outcome.name)
        assertEquals(current, repository.find(current.contributorId, current.period))
    }

    @Test
    fun `stale revision does not replace the current publication`() {
        val current = parser.parse(fixture().replace("\"revision\": 3", "\"revision\": 4"))
        val stale = parser.parse(fixture())
        ingest.execute(current)

        val result = ingest.execute(stale)

        assertEquals("STALE", result.outcome.name)
        assertEquals(current.revision, result.currentRevision)
        assertEquals(current, repository.find(current.contributorId, current.period))
    }

    @Test
    fun `isolates publications by contributor and period`() {
        val septemberA = parser.parse(fixture())
        val septemberB = parser.parse(fixture().replace("opaque-random-id", "contributor-b"))
        val octoberA = parser.parse(fixture().replace("2026-09", "2026-10"))

        ingest.execute(septemberA)
        ingest.execute(septemberB)
        ingest.execute(octoberA)

        assertNotEquals(septemberA, repository.find(septemberB.contributorId, septemberB.period))
        assertEquals(septemberB, repository.find(septemberB.contributorId, septemberB.period))
        assertEquals(octoberA, repository.find(octoberA.contributorId, octoberA.period))
    }

    @Test
    fun `rejects unsupported versions before ingestion`() {
        assertFailsWith<UnsupportedProtocolVersion> { parser.parse(fixture().replace("\"protocolVersion\": 1", "\"protocolVersion\": 99")) }
        assertFailsWith<com.gonezo.macroanalytics.ingestion.infrastructure.UnsupportedSchemaVersion> {
            parser.parse(fixture().replace("\"schemaVersion\": 1", "\"schemaVersion\": 99"))
        }
        assertEquals(null, repository.find(parser.parse(fixture()).contributorId, parser.parse(fixture()).period))
    }

    @Test
    fun `rejects malformed wire fields and financial buckets`() {
        val invalidPayloads = listOf(
            fixture().replace("2026-09", "2026-13"),
            fixture().replace("2026-09", "0000-09"),
            fixture().replace("\"revision\": 3", "\"revision\": 0"),
            fixture().replace("\"currency\": \"EUR\"", "\"currency\": \"EURO\""),
            fixture().replace("\"amount\": \"12.00\"", "\"amount\": \"-12.00\""),
            fixture().replace("\"count\": 1", "\"count\": 0"),
            fixture().replace("\"source\": \"POSTED\"", "\"source\": \"UNKNOWN\""),
            fixture().replace("\"kind\": \"EXPENSE\"", "\"kind\": \"UNKNOWN\""),
            fixture().replace("\"sex\": \"FEMALE\"", "\"sex\": \"UNKNOWN\""),
            fixture().replace("\"ageBand\": \"25_34\"", "\"ageBand\": \"UNKNOWN\""),
            fixture().replace("\"countryCode\": \"ES\"", "\"countryCode\": \"Spain\""),
            fixture().replace("opaque-random-id", "   "),
        )

        invalidPayloads.forEach { payload -> assertFailsWith<IllegalArgumentException> { parser.parse(payload) } }
    }

    private fun fixture() = File("../../contracts/macro-analytics/fixtures/publication-v1-valid.json").readText()
}

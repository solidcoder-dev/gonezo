package com.gonezo.macroanalytics.ingestion

import com.gonezo.macroanalytics.ingestion.infrastructure.MacroAnalyticsPublicationWireV1Parser
import com.gonezo.macroanalytics.ingestion.infrastructure.MacroAnalyticsPublicationWireV2Parser
import com.gonezo.macroanalytics.ingestion.infrastructure.MacroAnalyticsPublicationWireV3Parser
import com.gonezo.macroanalytics.ingestion.infrastructure.MacroAnalyticsPublicationWireV4Parser
import com.gonezo.macroanalytics.ingestion.infrastructure.MacroAnalyticsPublicationWireV5Parser
import com.gonezo.macroanalytics.ingestion.infrastructure.MacroAnalyticsPublicationWireV6Parser
import com.gonezo.macroanalytics.ingestion.infrastructure.MacroAnalyticsPublicationWireV7Parser
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFails

class MacroAnalyticsPublicationWireCompatibilityTest {
    @Test
    fun parsesEveryHistoricalPublicationFixtureWithItsExplicitParser() {
        parsers().forEach { (version, parser) ->
            val publication = parser.parse(fixture(version))

            assertEquals(version, publication.protocolVersion.value)
            assertEquals(version, publication.contribution.schemaVersion.value)
        }
    }

    @Test
    fun versionParsersRejectPayloadsFromAdjacentVersions() {
        parsers().zipWithNext().forEach { (current, next) ->
            assertFails { current.second.parse(fixture(next.first)) }
        }
    }

    private fun fixture(version: Int) = File("../../contracts/macro-analytics/fixtures/publication-v$version-valid.json").readText()

    private fun parsers() = listOf(
        1 to MacroAnalyticsPublicationWireV1Parser(),
        2 to MacroAnalyticsPublicationWireV2Parser(),
        3 to MacroAnalyticsPublicationWireV3Parser(),
        4 to MacroAnalyticsPublicationWireV4Parser(),
        5 to MacroAnalyticsPublicationWireV5Parser(),
        6 to MacroAnalyticsPublicationWireV6Parser(),
        7 to MacroAnalyticsPublicationWireV7Parser(),
    )
}

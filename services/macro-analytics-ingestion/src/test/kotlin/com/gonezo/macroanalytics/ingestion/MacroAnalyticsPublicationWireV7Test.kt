package com.gonezo.macroanalytics.ingestion

import com.gonezo.macroanalytics.ingestion.infrastructure.MacroAnalyticsPublicationProtocolDispatcher
import com.gonezo.macroanalytics.ingestion.infrastructure.MacroAnalyticsPublicationWireV7Parser
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFails
import kotlin.test.assertTrue

class MacroAnalyticsPublicationWireV7Test {
    @Test
    fun `parses V7 tag usage and canonicalizes it without tag identity`() {
        val fixture = File("../../contracts/macro-analytics/fixtures/publication-v7-valid.json").readText()
        val publication = MacroAnalyticsPublicationProtocolDispatcher().parse(fixture)

        assertEquals(7, publication.protocolVersion.value)
        assertEquals(7, publication.contribution.schemaVersion.value)
        assertTrue(publication.canonicalJson().contains("\"taggedAmount\":\"50\""))
        assertTrue(!publication.canonicalJson().contains("tagId"))
    }

    @Test
    fun `rejects schema mismatch, tag identity fields, invalid tagged totals, and financial mismatch`() {
        val fixture = File("../../contracts/macro-analytics/fixtures/publication-v7-valid.json").readText()
        val parser = MacroAnalyticsPublicationWireV7Parser()

        assertFails { parser.parse(fixture.replace("\"schemaVersion\": 7", "\"schemaVersion\": 6")) }
        assertFails { parser.parse(fixture.replace("\"taggedAmount\": \"50\"", "\"taggedAmount\": \"101\"")) }
        assertFails { parser.parse(fixture.replace("\"taggedMovementCount\": 1", "\"taggedMovementCount\": 0")) }
        assertFails { parser.parse(fixture.replace("\"taggedMovementCount\": 1", "\"taggedMovementCount\": 1, \"tagId\": \"private-tag\"")) }
        assertFails { parser.parse(fixture.replace("\"amount\": \"100\", \"movementCount\": 1", "\"amount\": \"99\", \"movementCount\": 1")) }
    }
}

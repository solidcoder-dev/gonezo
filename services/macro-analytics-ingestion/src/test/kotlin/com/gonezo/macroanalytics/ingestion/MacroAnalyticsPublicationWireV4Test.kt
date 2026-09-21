package com.gonezo.macroanalytics.ingestion

import com.gonezo.macroanalytics.ingestion.infrastructure.MacroAnalyticsPublicationProtocolDispatcher
import com.gonezo.macroanalytics.ingestion.infrastructure.MacroAnalyticsPublicationWireV4Parser
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFails

class MacroAnalyticsPublicationWireV4Test {
    @Test
    fun `parses V4 fixture with exact canonical sharing fields`() {
        val fixture = File("../../contracts/macro-analytics/fixtures/publication-v4-valid.json").readText()
        val publication = MacroAnalyticsPublicationProtocolDispatcher().parse(fixture)

        assertEquals(4, publication.protocolVersion.value)
        assertEquals(4, publication.contribution.schemaVersion.value)
        assertEquals(true, publication.canonicalJson().contains("\"settlementParticipantCount\":1"))
    }

    @Test
    fun `rejects sharing invariant violations and protocol schema mismatches`() {
        val fixture = File("../../contracts/macro-analytics/fixtures/publication-v4-valid.json").readText()
        val parser = MacroAnalyticsPublicationWireV4Parser()

        assertFails { parser.parse(fixture.replace("\"protocolVersion\": 4", "\"protocolVersion\": 3")) }
        assertFails { parser.parse(fixture.replace("\"schemaVersion\": 4", "\"schemaVersion\": 3")) }
        assertFails { parser.parse(fixture.replace("\"personalAmount\": \"6.00\"", "\"personalAmount\": \"7.00\"")) }
        assertFails { parser.parse(fixture.replace("\"participantAllocatedAmount\": \"4.00\"", "\"participantAllocatedAmount\": \"3.00\"")) }
        assertFails { parser.parse(fixture.replace("\"settlementParticipantCount\": 1", "\"settlementParticipantCount\": 3")) }
        assertFails { parser.parse(fixture.replace("\"movementCount\": 1", "\"movementCount\": 0")) }
        assertFails { parser.parse(fixture.replace("\"kind\": \"EXPENSE\", \"fullAmount\"", "\"kind\": \"TRANSFER_OUT\", \"fullAmount\"")) }
    }
}

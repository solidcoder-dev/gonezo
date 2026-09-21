package com.gonezo.macroanalytics.ingestion

import com.gonezo.macroanalytics.ingestion.infrastructure.MacroAnalyticsPublicationProtocolDispatcher
import com.gonezo.macroanalytics.ingestion.infrastructure.MacroAnalyticsPublicationWireV5Parser
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFails

class MacroAnalyticsPublicationWireV5Test {
    @Test
    fun `parses V5 fixture through protocol dispatcher and canonicalizes merchant buckets`() {
        val fixture = File("../../contracts/macro-analytics/fixtures/publication-v5-valid.json").readText()
        val publication = MacroAnalyticsPublicationProtocolDispatcher().parse(fixture)

        assertEquals(5, publication.protocolVersion.value)
        assertEquals(5, publication.contribution.schemaVersion.value)
        assertEquals(true, publication.canonicalJson().contains("\"catalogVersion\":1"))
        assertEquals(true, publication.canonicalJson().contains("\"merchant\":\"MERCADONA\""))
    }

    @Test
    fun `rejects invalid merchant codes catalog combinations and duplicate keys`() {
        val fixture = File("../../contracts/macro-analytics/fixtures/publication-v5-valid.json").readText()
        val parser = MacroAnalyticsPublicationWireV5Parser()
        assertFails { parser.parse(fixture.replace("\"protocolVersion\": 5", "\"protocolVersion\": 4")) }
        assertFails { parser.parse(fixture.replace("\"schemaVersion\": 5", "\"schemaVersion\": 4")) }
        assertFails { parser.parse(fixture.replace("\"merchant\": \"MERCADONA\"", "\"merchant\": \"PRIVATE_STORE_482\"")) }
        assertFails { parser.parse(fixture.replace("\"catalogVersion\": 1", "\"catalogVersion\": 2")) }
        assertFails { parser.parse(fixture.replace("\"movementCount\": 1", "\"movementCount\": 0")) }
        assertFails { parser.parse(fixture.replace("\"merchant\": \"UNMAPPED\"", "\"merchant\": \"MERCADONA\"")) }
    }
}

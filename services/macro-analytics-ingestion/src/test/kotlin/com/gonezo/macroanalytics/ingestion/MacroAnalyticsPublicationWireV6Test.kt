package com.gonezo.macroanalytics.ingestion

import com.gonezo.macroanalytics.ingestion.infrastructure.MacroAnalyticsPublicationProtocolDispatcher
import com.gonezo.macroanalytics.ingestion.infrastructure.MacroAnalyticsPublicationWireV6Parser
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFails

class MacroAnalyticsPublicationWireV6Test {
    @Test
    fun `parses signed V6 balance and includes it in canonical publication`() {
        val fixture = File("../../contracts/macro-analytics/fixtures/publication-v6-valid.json").readText()
        val publication = MacroAnalyticsPublicationProtocolDispatcher().parse(fixture)
        assertEquals(6, publication.protocolVersion.value)
        assertEquals(6, publication.contribution.schemaVersion.value)
        assertEquals(true, publication.canonicalJson().contains("\"balanceAmount\":\"-250.50\""))
    }

    @Test
    fun `rejects invalid balance type duplicate type duplicate currency and count`() {
        val fixture = File("../../contracts/macro-analytics/fixtures/publication-v6-valid.json").readText()
        val parser = MacroAnalyticsPublicationWireV6Parser()
        assertFails { parser.parse(fixture.replace("\"accountType\": \"BANK\"", "\"accountType\": \"PRIVATE\"")) }
        assertFails { parser.parse(fixture.replace("\"balanceAmount\": \"-250.50\"", "\"balanceAmount\": \"+250.50\"")) }
        assertFails { parser.parse(fixture.replace("\"accountCount\": 1", "\"accountCount\": 0")) }
        val repeatedType = fixture.replace("\"accountCount\": 1", "\"accountCount\": 1}, {\"accountType\": \"BANK\", \"balanceAmount\": \"1\", \"accountCount\": 1")
        assertFails { parser.parse(repeatedType) }
    }
}

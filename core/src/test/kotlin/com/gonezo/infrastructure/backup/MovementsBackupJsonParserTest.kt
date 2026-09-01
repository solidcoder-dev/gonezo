package com.gonezo.infrastructure.backup

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class MovementsBackupJsonParserTest {
    private val parser = MovementsBackupJsonParser()

    @Test
    fun `parses split item category id`() {
        val snapshot = parser.parse(payload("\"categoryId\":\"category-1\""))

        assertThat(snapshot.postedMovements.single().splitItems.single().categoryId).isEqualTo("category-1")
    }

    @Test
    fun `accepts older split item payload without category id`() {
        val snapshot = parser.parse(payload("\"note\":null"))

        assertThat(snapshot.postedMovements.single().splitItems.single().categoryId).isNull()
    }

    private fun payload(itemField: String): String =
        """
        {
          "schemaVersion": 2,
          "accounts": [],
          "categories": [],
          "tags": [],
          "postedMovements": [{
            "id": "movement-1",
            "accountId": "account-1",
            "type": "expense",
            "occurredAt": "2026-05-09T10:00:00Z",
            "amount": "12.30",
            "currency": "EUR",
            "splitItems": [{
              "id": "item-1",
              "name": "Lunch",
              "amount": "12.30",
              __ITEM_FIELD__
            }]
          }]
        }
        """.replace("__ITEM_FIELD__", itemField)
}

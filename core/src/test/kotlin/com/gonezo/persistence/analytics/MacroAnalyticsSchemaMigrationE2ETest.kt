package com.gonezo.persistence.analytics

import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class MacroAnalyticsSchemaMigrationE2ETest : SqliteE2ETest() {
    @Test
    fun `fresh schema creates empty macro analytics tables with scoped keys`() {
        assertThat(db.jdbcTemplate.queryForObject("select count(*) from macro_analytics_contributors", Int::class.java)).isZero()
        assertThat(db.jdbcTemplate.queryForObject("select count(*) from macro_analytics_outbox", Int::class.java)).isZero()
        assertThat(db.jdbcTemplate.queryForObject("select count(*) from macro_analytics_latest_publications", Int::class.java)).isZero()
        assertThat(db.jdbcTemplate.queryForList("pragma table_info(macro_analytics_outbox)", Map::class.java))
            .extracting<Map<*, *>> { it["name"] }
            .contains("owner_id", "period", "revision", "publication_json")

        db.jdbcTemplate.update(
            "insert into macro_analytics_outbox(owner_id, period, revision, publication_json) values (?, ?, ?, ?)",
            "owner-a", "2026-09", 1, "{}",
        )
        assertThatThrownByDuplicateOutboxKey()
    }

    private fun assertThatThrownByDuplicateOutboxKey() {
        org.assertj.core.api.Assertions.assertThatThrownBy {
            db.jdbcTemplate.update(
                "insert into macro_analytics_outbox(owner_id, period, revision, publication_json) values (?, ?, ?, ?)",
                "owner-a", "2026-09", 1, "{}",
            )
        }
    }
}

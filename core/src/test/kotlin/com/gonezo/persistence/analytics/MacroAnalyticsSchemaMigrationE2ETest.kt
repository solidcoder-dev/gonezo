package com.gonezo.persistence.analytics

import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test

class MacroAnalyticsSchemaMigrationE2ETest : SqliteE2ETest() {
    @Test
    fun `fresh schema creates empty macro analytics tables with scoped keys`() {
        assertThat(db.jdbcTemplate.queryForObject("select count(*) from macro_analytics_contributors", Int::class.java)).isZero()
        assertThat(db.jdbcTemplate.queryForObject("select count(*) from macro_analytics_outbox", Int::class.java)).isZero()
        assertThat(db.jdbcTemplate.queryForObject("select count(*) from macro_analytics_latest_publications", Int::class.java)).isZero()
        assertThat(db.jdbcTemplate.queryForList("pragma table_info(macro_analytics_outbox)").map { it["name"] })
            .containsExactly("owner_id", "period", "revision", "publication_json")

        db.jdbcTemplate.update(
            "insert into macro_analytics_outbox(owner_id, period, revision, publication_json) values (?, ?, ?, ?)",
            "owner-a", "2026-09", 1, "{}",
        )
        assertThatThrownByDuplicateOutboxKey()
        assertThatThrownBy {
            db.jdbcTemplate.update(
                "insert into macro_analytics_outbox(owner_id, period, revision, publication_json) values (?, ?, ?, ?)",
                "owner-a", "2026-10", 0, "{}",
            )
        }
        assertThatThrownBy {
            db.jdbcTemplate.update(
                "insert into macro_analytics_outbox(owner_id, period, revision, publication_json) values (?, ?, ?, ?)",
                "owner-a", "2026-13", 1, "{}",
            )
        }
    }

    @Test
    fun `version 38 migration preserves existing ledger rows and adds macro tables`() {
        db.migrateTo(38)
        db.jdbcTemplate.update(
            "insert into ledger_accounts(id, name, type, currency, status, created_at) values (?, ?, ?, ?, ?, ?)",
            "account-1", "Cash", "cash", "EUR", "active", "2026-01-01T00:00:00Z",
        )
        db.migratePending()

        assertThat(db.jdbcTemplate.queryForObject("select count(*) from ledger_accounts where id = 'account-1'", Int::class.java)).isEqualTo(1)
        assertThat(db.jdbcTemplate.queryForObject("select count(*) from macro_analytics_outbox", Int::class.java)).isZero()
        assertThat(db.jdbcTemplate.queryForObject("pragma integrity_check", String::class.java)).isEqualTo("ok")
        assertThat(db.jdbcTemplate.queryForList("pragma foreign_key_check")).isEmpty()
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

package com.gonezo.persistence.analytics

import com.gonezo.analytics.domain.AnalyticsExclusion
import com.gonezo.analytics.domain.AnalyticsExclusionReason
import com.gonezo.analytics.domain.AnalyticsExclusionScopeType
import com.gonezo.analytics.infrastructure.persistence.JdbcAnalyticsExclusionRepository
import com.gonezo.application.backup.contract.BackupImportContext
import com.gonezo.application.backup.contract.BackupSectionId
import com.gonezo.application.orchestration.backup.AnalyticsBackupSectionExporter
import com.gonezo.application.orchestration.backup.AnalyticsBackupSectionImporter
import com.gonezo.infrastructure.backup.AnalyticsBackupSectionCodec
import com.gonezo.testing.TestDatabase
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import java.time.Instant
import java.util.UUID

class AnalyticsExclusionMigrationE2ETest {
    @Test
    fun `repository round trips every supported reason through canonical persistence`() {
        val database = TestDatabase()
        try {
            database.migrate()
            val repository = JdbcAnalyticsExclusionRepository(database.namedJdbcTemplate)
            val exclusions = listOf(
                AnalyticsExclusion(UUID.randomUUID(), AnalyticsExclusionScopeType.MOVEMENT, "movement-0", AnalyticsExclusionReason.USER_IGNORED, Instant.parse("2026-06-29T10:15:00Z")),
                AnalyticsExclusion(UUID.randomUUID(), AnalyticsExclusionScopeType.MOVEMENT, "movement-1", AnalyticsExclusionReason.SHARED_EXPENSE, Instant.parse("2026-06-29T10:16:00Z")),
                AnalyticsExclusion(UUID.randomUUID(), AnalyticsExclusionScopeType.MOVEMENT, "movement-2", AnalyticsExclusionReason.REIMBURSEMENT, Instant.parse("2026-06-29T10:17:00Z")),
            )
            exclusions.forEach(repository::save)

            assertThat(database.jdbcTemplate.queryForList("select reason from analytics_exclusions order by reason").map { it["reason"] })
                .containsExactly("reimbursement", "shared_expense", "user_ignored")
            assertThat(repository.listAll()).containsExactlyInAnyOrderElementsOf(exclusions)
        } finally {
            database.close()
        }
    }

    @Test
    fun `normalizes legacy reason without changing row identity or other columns`() {
        val database = TestDatabase()
        try {
            database.migrateTo(29)
            database.jdbcTemplate.update(
                """
                insert into analytics_exclusions(id, scope_type, scope_id, reason, created_at)
                values ('legacy-id', 'share_participant', 'participant-1', 'shared_expense_lent_amount', '2026-06-29T10:15:00Z')
                """.trimIndent(),
            )
            val before = database.jdbcTemplate.queryForMap("select * from analytics_exclusions where id = 'legacy-id'")

            database.migratePending()

            val after = database.jdbcTemplate.queryForMap("select * from analytics_exclusions where id = 'legacy-id'")
            assertThat(after).containsExactlyInAnyOrderEntriesOf(before + ("reason" to "shared_expense"))
            assertThat(database.jdbcTemplate.queryForObject("select count(*) from analytics_exclusions", Int::class.java)).isEqualTo(1)
        } finally {
            database.close()
        }
    }

    @Test
    fun `real failed upgrade survives the released typo migration and is repaired by the next migration`() {
        val database = TestDatabase()
        try {
            database.migrateTo(29)
            insert(database, "legacy", "participant-1", "shared_expense_lent_amount")

            database.executeSqlResource("db/migration/V30__normalize_legacy_analytics_exclusion_reasons.sql")
            assertThat(database.jdbcTemplate.queryForObject("select reason from analytics_exclusions where id = 'legacy'", String::class.java))
                .isEqualTo("shared_expense_lent_amount")

            database.migratePending()
            assertThat(database.jdbcTemplate.queryForObject("select reason from analytics_exclusions where id = 'legacy'", String::class.java))
                .isEqualTo("shared_expense")
        } finally {
            database.close()
        }
    }

    @Test
    fun `normalizes only the proven legacy alias and preserves canonical rows`() {
        val database = TestDatabase()
        try {
            database.migrateTo(29)
            insert(database, "user", "movement-1", "user_ignored")
            insert(database, "share-1", "participant-1", "shared_expense")
            insert(database, "reimbursement", "expected-1", "reimbursement")
            insert(database, "legacy", "participant-2", "shared_expense_lent_amount")
            insert(database, "legacy-reimbursement", "movement-2", "shared_expense_reimbursement")

            val canonicalBefore = database.jdbcTemplate.queryForList(
                "select id, scope_type, scope_id, reason, created_at from analytics_exclusions where reason not in ('shared_expense_lent_amount', 'shared_expense_reimbursement') order by id",
            )
            database.migratePending()

            assertThat(database.jdbcTemplate.queryForList("select id, scope_type, scope_id, reason, created_at from analytics_exclusions where id in ('user', 'share-1', 'reimbursement') order by id"))
                .isEqualTo(canonicalBefore)
            assertThat(database.jdbcTemplate.queryForObject("select count(*) from analytics_exclusions where reason = 'shared_expense'", Int::class.java)).isEqualTo(2)
            assertThat(database.jdbcTemplate.queryForObject("select count(*) from analytics_exclusions", Int::class.java)).isEqualTo(5)
            assertThat(database.jdbcTemplate.queryForMap("select reason from analytics_exclusions where id = 'legacy-reimbursement'"))
                .containsEntry("reason", "reimbursement")
        } finally {
            database.close()
        }
    }

    @Test
    fun `archives the complete legacy row before resolving a canonical uniqueness collision`() {
        val database = TestDatabase()
        try {
            database.migrateTo(29)
            insert(database, "canonical", "participant-1", "shared_expense")
            insert(database, "legacy", "participant-1", "shared_expense_lent_amount")
            val legacyBefore = database.jdbcTemplate.queryForMap("select * from analytics_exclusions where id = 'legacy'")

            database.migratePending()

            assertThat(database.jdbcTemplate.queryForObject("select count(*) from analytics_exclusions", Int::class.java)).isEqualTo(1)
            assertThat(database.jdbcTemplate.queryForMap("select * from analytics_exclusions_legacy_archive where id = 'legacy'"))
                .isEqualTo(legacyBefore)
        } finally {
            database.close()
        }
    }

    @Test
    fun `unknown persisted reasons still fail loudly after migration`() {
        val database = TestDatabase()
        try {
            database.migrateTo(29)
            insert(database, "00000000-0000-4000-8000-000000000099", "movement-1", "totally_unknown_reason")
            database.migratePending()

            assertThatThrownBy { JdbcAnalyticsExclusionRepository(database.namedJdbcTemplate).listAll() }
                .isInstanceOf(IllegalArgumentException::class.java)
                .hasMessage("Unsupported analytics exclusion reason: totally_unknown_reason")
        } finally {
            database.close()
        }
    }

    @Test
    fun `migrated legacy data exports imports and exports with canonical analytics reason`() {
        val historical = TestDatabase()
        val restored = TestDatabase()
        try {
            historical.migrateTo(29)
            historical.jdbcTemplate.update(
                "insert into analytics_exclusions(id, scope_type, scope_id, reason, created_at) values ('00000000-0000-4000-8000-000000000100', 'movement', 'movement-1', 'shared_expense_lent_amount', '2026-06-29T10:15:00Z')",
            )
            historical.migratePending()

            val exportA = AnalyticsBackupSectionExporter(JdbcAnalyticsExclusionRepository(historical.namedJdbcTemplate)).export()
            assertThat(exportA.exclusions.single().reason).isEqualTo("shared_expense")
            val portableSection = AnalyticsBackupSectionCodec().decode(
                exportA.version,
                AnalyticsBackupSectionCodec().encode(exportA).getJSONObject("data"),
            )

            restored.migrate()
            val importer = AnalyticsBackupSectionImporter(JdbcAnalyticsExclusionRepository(restored.namedJdbcTemplate))
            importer.import(
                portableSection,
                BackupImportContext(Instant.parse("2026-06-30T00:00:00Z"), mapOf(BackupSectionId.ANALYTICS to portableSection)),
            )
            val exportB = AnalyticsBackupSectionExporter(JdbcAnalyticsExclusionRepository(restored.namedJdbcTemplate)).export()

            assertThat(exportB.exclusions).isEqualTo(exportA.exclusions)
            assertThat(restored.jdbcTemplate.queryForObject("select count(*) from analytics_exclusions", Int::class.java)).isEqualTo(1)
        } finally {
            historical.close()
            restored.close()
        }
    }

    private fun insert(database: TestDatabase, id: String, scopeId: String, reason: String) {
        database.jdbcTemplate.update(
            "insert into analytics_exclusions(id, scope_type, scope_id, reason, created_at) values (?, 'movement', ?, ?, '2026-06-29T10:15:00Z')",
            id,
            scopeId,
            reason,
        )
    }
}

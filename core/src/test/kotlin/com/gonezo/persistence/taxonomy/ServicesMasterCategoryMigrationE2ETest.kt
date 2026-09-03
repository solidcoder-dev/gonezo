package com.gonezo.persistence.taxonomy

import com.gonezo.testing.TestDatabase
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class ServicesMasterCategoryMigrationE2ETest {
    @Test
    fun `fresh database contains services and the original seeded categories`() {
        val database = TestDatabase()
        try {
            database.migrate()

            assertThat(database.jdbcTemplate.queryForMap(
                "select name, name_normalized, applies_to, status from taxonomy_categories where name_normalized = 'services' and applies_to = 'expense'",
            )).containsExactlyEntriesOf(
                mapOf(
                    "name" to "Services",
                    "name_normalized" to "services",
                    "applies_to" to "expense",
                    "status" to "active",
                ),
            )
            assertThat(database.jdbcTemplate.queryForObject(
                "select count(*) from taxonomy_categories where name_normalized = 'services' and applies_to = 'expense'",
                Int::class.java,
            )).isEqualTo(1)
            assertThat(database.jdbcTemplate.queryForObject(
                "select count(*) from taxonomy_categories where name_normalized in ('bills', 'groceries', 'beauty', 'other')",
                Int::class.java,
            )).isEqualTo(5)
        } finally {
            database.close()
        }
    }

    @Test
    fun `adds services without changing existing taxonomy data or assignments`() {
        val database = TestDatabase()
        try {
            database.migrateTo(31)
            insertExistingData(database)
            val categoriesBefore = database.jdbcTemplate.queryForList(
                "select id, name, name_normalized, applies_to, status, created_at, archived_at from taxonomy_categories order by id",
            )
            val assignmentBefore = database.jdbcTemplate.queryForMap(
                "select transaction_id, category_id, assigned_at from taxonomy_transaction_assignments where transaction_id = 'transaction-1'",
            )

            database.migratePending()

            assertThat(database.jdbcTemplate.queryForList(
                "select id, name, name_normalized, applies_to, status, created_at, archived_at from taxonomy_categories where id <> '00000000-0000-4000-8000-000000000111' order by id",
            )).containsExactlyElementsOf(categoriesBefore)
            assertThat(database.jdbcTemplate.queryForObject("select id from ledger_transactions where id = 'transaction-1'", String::class.java))
                .isEqualTo("transaction-1")
            assertThat(database.jdbcTemplate.queryForMap(
                "select transaction_id, category_id, assigned_at from taxonomy_transaction_assignments where transaction_id = 'transaction-1'",
            )).isEqualTo(assignmentBefore)
            assertThat(database.jdbcTemplate.queryForObject(
                "select count(*) from taxonomy_categories where name_normalized = 'services' and applies_to = 'expense'",
                Int::class.java,
            )).isEqualTo(1)
            assertThat(database.jdbcTemplate.queryForObject(
                "select status from taxonomy_categories where name_normalized = 'services' and applies_to = 'expense'",
                String::class.java,
            )).isEqualTo("active")
        } finally {
            database.close()
        }
    }

    @Test
    fun `preserves a pre-existing services category instead of creating a duplicate`() {
        val database = TestDatabase()
        try {
            database.migrateTo(31)
            database.jdbcTemplate.update(
                """
                insert into taxonomy_categories (id, name, name_normalized, applies_to, status, created_at, archived_at)
                values ('user-services', 'My Services', 'services', 'expense', 'archived', '2026-08-01T10:00:00Z', '2026-08-02T10:00:00Z')
                """.trimIndent(),
            )

            database.migratePending()

            assertThat(database.jdbcTemplate.queryForMap(
                "select id, name, name_normalized, applies_to, status, created_at, archived_at from taxonomy_categories where name_normalized = 'services' and applies_to = 'expense'",
            )).containsExactlyEntriesOf(
                mapOf(
                    "id" to "user-services",
                    "name" to "My Services",
                    "name_normalized" to "services",
                    "applies_to" to "expense",
                    "status" to "archived",
                    "created_at" to "2026-08-01T10:00:00Z",
                    "archived_at" to "2026-08-02T10:00:00Z",
                ),
            )
        } finally {
            database.close()
        }
    }

    private fun insertExistingData(database: TestDatabase) {
        database.jdbcTemplate.update(
            "insert into ledger_accounts (id, name, type, currency, status, created_at, archived_at) values ('account-1', 'Main', 'cash', 'EUR', 'active', '2026-08-01T10:00:00Z', null)",
        )
        database.jdbcTemplate.update(
            "insert into taxonomy_categories (id, name, name_normalized, applies_to, status, created_at, archived_at) values ('category-1', 'Custom', 'custom', 'expense', 'active', '2026-08-01T10:00:00Z', null)",
        )
        database.jdbcTemplate.update(
            "insert into ledger_transactions (id, account_id, type, amount, currency, occurred_at, description, merchant, category_id, status, linked_transaction_id) values ('transaction-1', 'account-1', 'expense', '12.34', 'EUR', '2026-08-01T11:00:00Z', 'Existing', 'Store', null, 'posted', null)",
        )
        database.jdbcTemplate.update(
            "insert into taxonomy_transaction_assignments (transaction_id, category_id, assigned_at) values ('transaction-1', 'category-1', '2026-08-01T11:01:00Z')",
        )
    }
}

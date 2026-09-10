package com.gonezo.persistence.sharing

import com.gonezo.testing.TestDatabase
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class SharingSettlementMigrationE2ETest {
    @Test
    fun `V36 sharing rows receive generalized movement and settlement data`() {
        val database = TestDatabase()
        try {
            database.migrateTo(36)
            database.jdbcTemplate.update("insert into ledger_accounts(id, name, type, currency, status, created_at) values ('account-1', 'Cash', 'asset', 'EUR', 'active', '2026-01-01T00:00:00Z')")
            database.jdbcTemplate.update("insert into ledger_transactions(id, account_id, type, amount, currency, occurred_at, status) values ('movement-1', 'account-1', 'expense', '10.00', 'EUR', '2026-01-01T00:00:00Z', 'posted')")
            database.jdbcTemplate.update("insert into expected_movements(id, account_id, movement_type, amount, currency, expected_at, status, resolved_transaction_id, created_at, updated_at) values ('expected-1', 'account-1', 'income', '3.33', 'EUR', '2026-01-02T00:00:00Z', 'pending', null, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')")
            database.jdbcTemplate.update("insert into sharing_persons(id, display_name, normalized_name, created_at) values ('owner-1', 'Owner', 'owner', '2026-01-01T00:00:00Z')")
            database.jdbcTemplate.update("insert into sharing_persons(id, display_name, normalized_name, created_at) values ('person-1', 'Alex', 'alex', '2026-01-01T00:00:00Z')")
            database.jdbcTemplate.update("insert into sharing_expense_shares(id, source_transaction_id, payer_person_id, total_amount, currency, created_at, updated_at) values ('share-1', 'movement-1', 'owner-1', '10.00', 'EUR', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')")
            database.jdbcTemplate.update("insert into sharing_expense_share_participants(id, share_id, person_id, amount, reimbursable, expected_movement_id) values ('participant-1', 'share-1', 'person-1', '3.33', 1, 'expected-1')")

            database.migratePending()

            assertThat(database.jdbcTemplate.queryForMap("select movement_type, allocation_mode, owner_amount from sharing_expense_shares where id = 'share-1'"))
                .containsEntry("movement_type", "expense")
                .containsEntry("allocation_mode", "amounts")
                .containsEntry("owner_amount", "6.67")
            assertThat(database.jdbcTemplate.queryForMap("select settlement_status, settlement_transaction_id from sharing_expense_share_participants where id = 'participant-1'"))
                .containsEntry("settlement_status", "pending")
                .containsEntry("settlement_transaction_id", null)
        } finally {
            database.close()
        }
    }
}

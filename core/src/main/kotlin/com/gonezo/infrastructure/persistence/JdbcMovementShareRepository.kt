package com.gonezo.sharing.infrastructure.persistence

import com.gonezo.sharing.domain.MovementShare
import com.gonezo.sharing.domain.MovementShareId
import com.gonezo.sharing.domain.ShareParticipant
import com.gonezo.sharing.domain.ShareParticipantId
import com.gonezo.sharing.domain.ShareAllocationMode
import com.gonezo.sharing.domain.ShareSettlementStatus
import com.gonezo.sharing.domain.SharedMovementType
import com.gonezo.sharing.domain.SharingPersonId
import com.gonezo.sharing.domain.ports.MovementShareRepository
import org.springframework.jdbc.core.RowMapper
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.sql.ResultSet
import java.time.Instant

@Repository
class JdbcMovementShareRepository(private val jdbcTemplate: NamedParameterJdbcTemplate) : MovementShareRepository {
    override fun save(share: MovementShare) {
        jdbcTemplate.update(
            """
            insert into sharing_expense_shares (
              id, source_transaction_id, payer_person_id, total_amount, currency, movement_type, allocation_mode, owner_amount, created_at, updated_at
            ) values (
              :id, :source_transaction_id, :payer_person_id, :total_amount, :currency, :movement_type, :allocation_mode, :owner_amount, :created_at, :updated_at
            )
            on conflict(id) do update set
              source_transaction_id = excluded.source_transaction_id,
              payer_person_id = excluded.payer_person_id,
              total_amount = excluded.total_amount,
              currency = excluded.currency,
              movement_type = excluded.movement_type,
              allocation_mode = excluded.allocation_mode,
              owner_amount = excluded.owner_amount,
              updated_at = excluded.updated_at
            """.trimIndent(),
            shareParams(share),
        )
        jdbcTemplate.update(
            "delete from sharing_expense_share_participants where share_id = :share_id",
            MapSqlParameterSource("share_id", share.id.toString()),
        )
        share.participants.forEach { participant -> saveParticipant(share.id, participant) }
    }

    override fun findBySourceTransactionId(sourceTransactionId: String): MovementShare? = jdbcTemplate
        .query(
            """
                select id, source_transaction_id, payer_person_id, total_amount, currency, movement_type, allocation_mode, owner_amount, created_at, updated_at
                from sharing_expense_shares
                where source_transaction_id = :source_transaction_id
                limit 1
            """.trimIndent(),
            MapSqlParameterSource("source_transaction_id", sourceTransactionId),
            shareRowMapper(),
        ).firstOrNull()
        ?.let { row ->
            MovementShare(
                id = row.id,
                sourceTransactionId = row.sourceTransactionId,
                payerPersonId = row.payerPersonId,
                totalAmount = row.totalAmount,
                currency = row.currency,
                participants = loadParticipants(row.id),
                createdAt = row.createdAt,
                updatedAt = row.updatedAt,
                movementType = SharedMovementType.valueOf(row.movementType.uppercase()),
                allocationMode = ShareAllocationMode.valueOf(row.allocationMode.uppercase()),
                ownerAllocation = row.ownerAllocation,
            )
        }

    override fun listAll(): List<MovementShare> = jdbcTemplate.query(
        "select source_transaction_id from sharing_expense_shares order by id",
        MapSqlParameterSource(),
    ) { rs, _ -> rs.getString("source_transaction_id") }.mapNotNull(::findBySourceTransactionId)

    private fun saveParticipant(shareId: MovementShareId, participant: ShareParticipant) {
        jdbcTemplate.update(
            """
            insert into sharing_expense_share_participants (
              id, share_id, person_id, amount, reimbursable, expected_movement_id, settlement_status, settlement_transaction_id
            ) values (
              :id, :share_id, :person_id, :amount, :reimbursable, :expected_movement_id, :settlement_status, :settlement_transaction_id
            )
            """.trimIndent(),
            MapSqlParameterSource()
                .addValue("id", participant.id.toString())
                .addValue("share_id", shareId.toString())
                .addValue("person_id", participant.personId.toString())
                .addValue("amount", participant.amount.toPlainString())
                .addValue("reimbursable", if (participant.reimbursable) 1 else 0)
                .addValue("expected_movement_id", participant.expectedMovementId)
                .addValue("settlement_status", participant.settlementStatus.name.lowercase())
                .addValue("settlement_transaction_id", participant.settlementTransactionId),
        )
    }

    private fun loadParticipants(shareId: MovementShareId): List<ShareParticipant> = jdbcTemplate.query(
        """
            select id, person_id, amount, reimbursable, expected_movement_id, settlement_status, settlement_transaction_id
            from sharing_expense_share_participants
            where share_id = :share_id
            order by id asc
        """.trimIndent(),
        MapSqlParameterSource("share_id", shareId.toString()),
        participantRowMapper(),
    )

    private fun shareParams(share: MovementShare): MapSqlParameterSource = MapSqlParameterSource()
        .addValue("id", share.id.toString())
        .addValue("source_transaction_id", share.sourceTransactionId)
        .addValue("payer_person_id", share.payerPersonId.toString())
        .addValue("total_amount", share.totalAmount.toPlainString())
        .addValue("currency", share.currency)
        .addValue("movement_type", share.movementType.name.lowercase())
        .addValue("allocation_mode", share.allocationMode.name.lowercase())
        .addValue("owner_amount", share.ownerAllocation.toPlainString())
        .addValue("created_at", share.createdAt.toString())
        .addValue("updated_at", share.updatedAt.toString())

    private fun shareRowMapper(): RowMapper<MovementShareRow> = RowMapper { rs: ResultSet, _ ->
        MovementShareRow(
            id = MovementShareId.from(rs.getString("id")),
            sourceTransactionId = rs.getString("source_transaction_id"),
            payerPersonId = SharingPersonId.from(rs.getString("payer_person_id")),
            totalAmount = BigDecimal(rs.getString("total_amount")),
            currency = rs.getString("currency"),
            movementType = rs.getString("movement_type"),
            allocationMode = rs.getString("allocation_mode"),
            ownerAllocation = BigDecimal(rs.getString("owner_amount")),
            createdAt = Instant.parse(rs.getString("created_at")),
            updatedAt = Instant.parse(rs.getString("updated_at")),
        )
    }

    private fun participantRowMapper(): RowMapper<ShareParticipant> = RowMapper { rs: ResultSet, _ ->
        ShareParticipant(
            id = ShareParticipantId.from(rs.getString("id")),
            personId = SharingPersonId.from(rs.getString("person_id")),
            amount = BigDecimal(rs.getString("amount")),
            settlementStatus = ShareSettlementStatus.valueOf(rs.getString("settlement_status").uppercase()),
            expectedMovementId = rs.getString("expected_movement_id"),
            settlementTransactionId = rs.getString("settlement_transaction_id"),
        )
    }

    private data class MovementShareRow(val id: MovementShareId, val sourceTransactionId: String, val payerPersonId: SharingPersonId, val totalAmount: BigDecimal, val currency: String, val movementType: String, val allocationMode: String, val ownerAllocation: BigDecimal, val createdAt: Instant, val updatedAt: Instant)
}

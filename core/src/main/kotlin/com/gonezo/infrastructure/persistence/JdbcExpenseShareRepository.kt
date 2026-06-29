package com.gonezo.sharing.infrastructure.persistence

import com.gonezo.sharing.domain.ExpenseShare
import com.gonezo.sharing.domain.ExpenseShareId
import com.gonezo.sharing.domain.ShareParticipant
import com.gonezo.sharing.domain.ShareParticipantId
import com.gonezo.sharing.domain.SharingPersonId
import com.gonezo.sharing.domain.ports.ExpenseShareRepository
import org.springframework.jdbc.core.RowMapper
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.sql.ResultSet
import java.time.Instant

@Repository
class JdbcExpenseShareRepository(
  private val jdbcTemplate: NamedParameterJdbcTemplate,
) : ExpenseShareRepository {
  override fun save(share: ExpenseShare) {
    jdbcTemplate.update(
      """
        insert into sharing_expense_shares (
          id, source_transaction_id, payer_person_id, total_amount, currency, created_at, updated_at
        ) values (
          :id, :source_transaction_id, :payer_person_id, :total_amount, :currency, :created_at, :updated_at
        )
        on conflict(id) do update set
          source_transaction_id = excluded.source_transaction_id,
          payer_person_id = excluded.payer_person_id,
          total_amount = excluded.total_amount,
          currency = excluded.currency,
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

  override fun findBySourceTransactionId(sourceTransactionId: String): ExpenseShare? =
    jdbcTemplate.query(
      """
        select id, source_transaction_id, payer_person_id, total_amount, currency, created_at, updated_at
        from sharing_expense_shares
        where source_transaction_id = :source_transaction_id
        limit 1
      """.trimIndent(),
      MapSqlParameterSource("source_transaction_id", sourceTransactionId),
      shareRowMapper(),
    ).firstOrNull()?.let { row ->
      ExpenseShare(
        id = row.id,
        sourceTransactionId = row.sourceTransactionId,
        payerPersonId = row.payerPersonId,
        totalAmount = row.totalAmount,
        currency = row.currency,
        participants = loadParticipants(row.id),
        createdAt = row.createdAt,
        updatedAt = row.updatedAt,
      )
    }

  private fun saveParticipant(shareId: ExpenseShareId, participant: ShareParticipant) {
    jdbcTemplate.update(
      """
        insert into sharing_expense_share_participants (
          id, share_id, person_id, amount, reimbursable, expected_movement_id
        ) values (
          :id, :share_id, :person_id, :amount, :reimbursable, :expected_movement_id
        )
      """.trimIndent(),
      MapSqlParameterSource()
        .addValue("id", participant.id.toString())
        .addValue("share_id", shareId.toString())
        .addValue("person_id", participant.personId.toString())
        .addValue("amount", participant.amount.toPlainString())
        .addValue("reimbursable", if (participant.reimbursable) 1 else 0)
        .addValue("expected_movement_id", participant.expectedMovementId),
    )
  }

  private fun loadParticipants(shareId: ExpenseShareId): List<ShareParticipant> =
    jdbcTemplate.query(
      """
        select id, person_id, amount, reimbursable, expected_movement_id
        from sharing_expense_share_participants
        where share_id = :share_id
        order by id asc
      """.trimIndent(),
      MapSqlParameterSource("share_id", shareId.toString()),
      participantRowMapper(),
    )

  private fun shareParams(share: ExpenseShare): MapSqlParameterSource =
    MapSqlParameterSource()
      .addValue("id", share.id.toString())
      .addValue("source_transaction_id", share.sourceTransactionId)
      .addValue("payer_person_id", share.payerPersonId.toString())
      .addValue("total_amount", share.totalAmount.toPlainString())
      .addValue("currency", share.currency)
      .addValue("created_at", share.createdAt.toString())
      .addValue("updated_at", share.updatedAt.toString())

  private fun shareRowMapper(): RowMapper<ExpenseShareRow> = RowMapper { rs: ResultSet, _ ->
    ExpenseShareRow(
      id = ExpenseShareId.from(rs.getString("id")),
      sourceTransactionId = rs.getString("source_transaction_id"),
      payerPersonId = SharingPersonId.from(rs.getString("payer_person_id")),
      totalAmount = BigDecimal(rs.getString("total_amount")),
      currency = rs.getString("currency"),
      createdAt = Instant.parse(rs.getString("created_at")),
      updatedAt = Instant.parse(rs.getString("updated_at")),
    )
  }

  private fun participantRowMapper(): RowMapper<ShareParticipant> = RowMapper { rs: ResultSet, _ ->
    ShareParticipant(
      id = ShareParticipantId.from(rs.getString("id")),
      personId = SharingPersonId.from(rs.getString("person_id")),
      amount = BigDecimal(rs.getString("amount")),
      reimbursable = rs.getInt("reimbursable") == 1,
      expectedMovementId = rs.getString("expected_movement_id"),
    )
  }

  private data class ExpenseShareRow(
    val id: ExpenseShareId,
    val sourceTransactionId: String,
    val payerPersonId: SharingPersonId,
    val totalAmount: BigDecimal,
    val currency: String,
    val createdAt: Instant,
    val updatedAt: Instant,
  )
}

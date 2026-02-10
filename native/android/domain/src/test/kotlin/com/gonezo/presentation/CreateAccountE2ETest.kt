package com.gonezo.presentation

import com.gonezo.application.CreateAccountCommand
import com.gonezo.domain.cashledger.AccountType
import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.util.UUID

class CreateAccountE2ETest : SqliteE2ETest() {

  override fun sqlResources() = listOf("sql/create_account_setup.sql")

  @Test
  fun `creates account and persists it`() {
    val command = CreateAccountCommand(
      userId = UUID.randomUUID(),
      name = "Primary Checking",
      type = AccountType.BANK,
      currency = "USD",
    )

    val accountId = app.createAccountUC.execute(command)

    val row = db.jdbcTemplate.queryForMap(
      "select id, user_id, name, type, currency from accounts where id = ?",
      accountId.toString(),
    )

    assertThat(row["id"].toString()).isEqualTo(accountId.toString())
    assertThat(row["user_id"].toString()).isEqualTo(command.userId.toString())
    assertThat(row["name"]).isEqualTo(command.name)
    assertThat(row["type"]).isEqualTo(command.type.value)
    assertThat(row["currency"]).isEqualTo(command.currency)
  }
}

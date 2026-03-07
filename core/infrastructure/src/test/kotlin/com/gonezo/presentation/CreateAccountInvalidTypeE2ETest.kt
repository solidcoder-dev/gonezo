package com.gonezo.presentation

import com.gonezo.domain.cashledger.AccountType
import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows

class CreateAccountInvalidTypeE2ETest : SqliteE2ETest() {

  override fun sqlResources() = listOf("sql/invalid_account_type_setup.sql")

  @Test
  fun `rejects invalid account type`() {
    val exception = assertThrows<IllegalArgumentException> {
      AccountType.from("invalid_type")
    }

    assertThat(exception.message).contains("Unsupported account type")

    val count = db.jdbcTemplate.queryForObject("select count(*) from accounts", Int::class.java)
    assertThat(count).isEqualTo(0)
  }
}

package com.gonezo.ledger.domain

import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test

class AccountTypeTest {
    @Test
    fun `accepts canonical values case insensitively`() {
        assertThat(AccountType.entries.map { it.value }).containsExactly("bank", "cash", "card", "wallet", "savings", "other")
        AccountType.entries.forEach { type ->
            assertThat(AccountType.from(type.value.uppercase())).isEqualTo(type)
        }
    }

    @Test
    fun `rejects unsupported values`() {
        assertThatThrownBy { AccountType.from("crypto") }
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessage("Unsupported account type: crypto")
    }
}

package com.gonezo.domain.shared

import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test

class CurrencyCodeSharedKernelTest {

  @Test
  fun `normalizes supported currency codes`() {
    assertThat(CurrencyCode.from(" eur ").value).isEqualTo("EUR")
  }

  @Test
  fun `rejects unsupported currency codes`() {
    assertThatThrownBy { CurrencyCode.from("AAA") }
      .isInstanceOf(IllegalArgumentException::class.java)
      .hasMessageContaining("unsupported currency code")
  }
}

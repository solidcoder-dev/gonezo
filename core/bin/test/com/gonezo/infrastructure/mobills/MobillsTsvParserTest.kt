package com.gonezo.infrastructure.mobills

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.nio.charset.StandardCharsets
import java.time.Instant

class MobillsTsvParserTest {

  @Test
  fun `parses utf16 tsv and normalizes rows`() {
    val parser = MobillsTsvParser()
    val input = """
      date	account	value	currency	description	merchant	category	subcategory	tags
      2026-03-20	Cash Wallet	-12.50	EUR	Lunch	Cafe	Food	Eating Out	trip|london|Trip
      2026-03-21	Cash Wallet	1500	EUR	Salary	Employer	Salary	Monthly	work, salary
    """.trimIndent().replace("\n", "\r\n")
      .toByteArray(StandardCharsets.UTF_16)

    val result = parser.parse(input)

    assertThat(result.issues).isEmpty()
    assertThat(result.rows).hasSize(2)

    val expense = result.rows[0]
    assertThat(expense.sourceLine).isEqualTo(2)
    assertThat(expense.accountName).isEqualTo("Cash Wallet")
    assertThat(expense.occurredAt).isEqualTo(Instant.parse("2026-03-20T00:00:00Z"))
    assertThat(expense.value).isEqualByComparingTo(BigDecimal("-12.50"))
    assertThat(expense.currency).isEqualTo("EUR")
    assertThat(expense.category).isEqualTo("Food")
    assertThat(expense.tags).containsExactly("trip", "london")

    val income = result.rows[1]
    assertThat(income.sourceLine).isEqualTo(3)
    assertThat(income.value).isEqualByComparingTo(BigDecimal("1500"))
    assertThat(income.category).isEqualTo("Salary")
    assertThat(income.tags).containsExactly("work", "salary")
  }

  @Test
  fun `collects issues for invalid rows and keeps valid ones`() {
    val parser = MobillsTsvParser()
    val input = """
      date	account	value	currency	description	merchant	category	subcategory	tags
      invalid-date	Cash Wallet	-10.00	EUR	Broken	Cafe	Food	Out	london
      2026-03-22		-10.00	EUR	Broken	Cafe	Food	Out	london
      2026-03-23	Cash Wallet	0	EUR	Zero	Cafe	Food	Out	london
      2026-03-24	Cash Wallet	10.00	EUR	Ok	Cafe	Salary	Monthly	payroll
    """.trimIndent().replace("\n", "\r\n")
      .toByteArray(StandardCharsets.UTF_16)

    val result = parser.parse(input)

    assertThat(result.rows).hasSize(1)
    assertThat(result.rows.single().sourceLine).isEqualTo(5)
    assertThat(result.issues).hasSize(3)
    assertThat(result.issues.map { it.code })
      .containsExactly("INVALID_DATE", "MISSING_ACCOUNT", "ZERO_VALUE")
    assertThat(result.issues.map { it.lineNumber })
      .containsExactly(2, 3, 4)
  }

  @Test
  fun `parses csv with quoted fields and commas`() {
    val parser = MobillsTsvParser()
    val input = """
      date,account,value,currency,description,merchant,category,subcategory,tags
      2026-03-20,"Cash, Wallet",-12.50,EUR,"Lunch, team",Cafe,Food,Eating Out,"trip,london,Trip"
      2026-03-21,Cash Wallet,1500,EUR,Salary,Employer,Salary,Monthly,"work;salary"
    """.trimIndent().replace("\n", "\r\n")
      .toByteArray(StandardCharsets.UTF_16)

    val result = parser.parse(input)

    assertThat(result.issues).isEmpty()
    assertThat(result.rows).hasSize(2)

    val expense = result.rows[0]
    assertThat(expense.accountName).isEqualTo("Cash, Wallet")
    assertThat(expense.description).isEqualTo("Lunch, team")
    assertThat(expense.tags).containsExactly("trip", "london")

    val income = result.rows[1]
    assertThat(income.value).isEqualByComparingTo(BigDecimal("1500"))
    assertThat(income.tags).containsExactly("work", "salary")
  }

  @Test
  fun `parses semicolon separated export with quoted headers and values`() {
    val parser = MobillsTsvParser()
    val input = """
      "Date";"Description";"Value";"Account";"Category";"Subcategory";"Tags"
      "31/07/2018";"Limpiar coche";"-1.10";"Billetera";"Transporte";"";""
      "31/07/2018";"Pollo y papas";"-8.30";"Billetera";"Alimentación";"";"trip;london"
    """.trimIndent().replace("\n", "\r\n")
      .toByteArray(StandardCharsets.UTF_16)

    val result = parser.parse(input)

    assertThat(result.issues).isEmpty()
    assertThat(result.rows).hasSize(2)

    val first = result.rows[0]
    assertThat(first.accountName).isEqualTo("Billetera")
    assertThat(first.description).isEqualTo("Limpiar coche")
    assertThat(first.category).isEqualTo("Transporte")
    assertThat(first.value).isEqualByComparingTo(BigDecimal("-1.10"))
    assertThat(first.occurredAt).isEqualTo(Instant.parse("2018-07-31T00:00:00Z"))

    val second = result.rows[1]
    assertThat(second.category).isEqualTo("Alimentación")
    assertThat(second.tags).containsExactly("trip", "london")
  }
}

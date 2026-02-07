package com.gonezo.presentation

import com.gonezo.api.ApiApplication
import org.assertj.core.api.Assertions.assertThat
import org.flywaydb.core.Flyway
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.core.io.ResourceLoader
import org.springframework.http.HttpStatus
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.springframework.web.client.RestClient
import org.testcontainers.containers.PostgreSQLContainer
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

@SpringBootTest(classes = [ApiApplication::class], webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class PostIncomeE2ETest {

  @LocalServerPort
  private var port: Int = 0

  @Autowired
  private lateinit var jdbcTemplate: JdbcTemplate

  @Autowired
  private lateinit var resourceLoader: ResourceLoader

  @Autowired
  private lateinit var flyway: Flyway

  @BeforeEach
  fun setup() {
    flyway.migrate()
    val resource = resourceLoader.getResource("classpath:sql/post_income_setup.sql")
    val sql = resource.inputStream.bufferedReader().readText()
    jdbcTemplate.execute(sql)
  }

  @Test
  fun `posts income and persists transaction`() {
    val restClient = RestClient.create("http://localhost:$port")

    val request = PostIncomeRequest(
      budgetPlanId = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
      accountId = UUID.fromString("11111111-1111-1111-1111-111111111111"),
      postedDate = LocalDate.of(2026, 2, 1),
      effectiveDate = LocalDate.of(2026, 2, 1),
      amount = BigDecimal("125.50"),
      currency = "USD",
      merchant = "Acme Payroll",
      categoryId = UUID.fromString("cccccccc-cccc-cccc-cccc-cccccccccccc"),
      recurring = true,
    )

    val response = restClient.post()
      .uri("/transactions/income")
      .body(request)
      .retrieve()
      .toEntity(CreateTransactionResponse::class.java)

    assertThat(response.statusCode).isEqualTo(HttpStatus.CREATED)
    val transactionId = response.body!!.id

    val row = jdbcTemplate.queryForMap(
      "select id, account_id, posted_date, effective_date, amount, currency, type, merchant, category_id, recurring from transactions where id = ?",
      transactionId,
    )

    assertThat(row["id"].toString()).isEqualTo(transactionId.toString())
    assertThat(row["account_id"].toString()).isEqualTo(request.accountId.toString())
    assertThat(row["posted_date"].toString()).isEqualTo(request.postedDate.toString())
    assertThat(row["effective_date"].toString()).isEqualTo(request.effectiveDate.toString())
    assertThat((row["amount"] as BigDecimal)).isEqualTo(request.amount)
    assertThat(row["currency"]).isEqualTo(request.currency)
    assertThat(row["type"]).isEqualTo("income")
    assertThat(row["merchant"]).isEqualTo(request.merchant)
    assertThat(row["category_id"].toString()).isEqualTo(request.categoryId.toString())
    assertThat(row["recurring"]).isEqualTo(true)

    val periodRow = jdbcTemplate.queryForMap(
      "select income_total_amount, remainder_amount from budget_periods where id = ?",
      UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
    )
    assertThat(periodRow["income_total_amount"] as BigDecimal).isEqualByComparingTo(BigDecimal("225.50"))
    assertThat(periodRow["remainder_amount"] as BigDecimal).isEqualByComparingTo(BigDecimal("150.50"))

    val balanceRow = jdbcTemplate.queryForMap(
      "select available_amount, safe_to_spend_amount from category_balances where id = ?",
      UUID.fromString("dddddddd-dddd-dddd-dddd-dddddddddddd"),
    )
    assertThat(balanceRow["available_amount"] as BigDecimal).isEqualByComparingTo(BigDecimal("135.50"))
    assertThat(balanceRow["safe_to_spend_amount"] as BigDecimal).isEqualByComparingTo(BigDecimal("135.50"))
  }

  companion object {
    @Container
    private val postgres = PostgreSQLContainer("postgres:16").apply {
      withDatabaseName("gonezo")
      withUsername("gonezo")
      withPassword("gonezo")
    }

    @JvmStatic
    @DynamicPropertySource
    fun registerProperties(registry: DynamicPropertyRegistry) {
      registry.add("spring.datasource.url", postgres::getJdbcUrl)
      registry.add("spring.datasource.username", postgres::getUsername)
      registry.add("spring.datasource.password", postgres::getPassword)
    }
  }
}

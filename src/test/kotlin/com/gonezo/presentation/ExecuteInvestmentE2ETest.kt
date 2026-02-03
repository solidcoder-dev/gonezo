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
class ExecuteInvestmentE2ETest {

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
    val resource = resourceLoader.getResource("classpath:sql/execute_investment_setup.sql")
    val sql = resource.inputStream.bufferedReader().readText()
    jdbcTemplate.execute(sql)
  }

  @Test
  fun `executes investment and creates budget link`() {
    val restClient = RestClient.create("http://localhost:$port")

    val request = ExecuteInvestmentRequest(
      containerId = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
      date = LocalDate.of(2026, 2, 3),
      type = "buy",
      assetId = UUID.fromString("cccccccc-cccc-cccc-cccc-cccccccccccc"),
      quantity = BigDecimal("2.5"),
      amount = BigDecimal("250.00"),
      currency = "USD",
      feesAmount = BigDecimal("1.50"),
      note = "test",
      budgetPeriodId = UUID.fromString("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"),
      categoryId = UUID.fromString("ffffffff-ffff-ffff-ffff-ffffffffffff"),
    )

    val response = restClient.post()
      .uri("/investments/execute")
      .body(request)
      .retrieve()
      .toEntity(ExecuteInvestmentResponse::class.java)

    assertThat(response.statusCode).isEqualTo(HttpStatus.CREATED)
    val investmentId = response.body!!.id

    val txRow = jdbcTemplate.queryForMap(
      "select id, container_id, date, type, asset_id, quantity, amount, currency, fees_amount, fees_currency, note from investment_transactions where id = ?",
      investmentId,
    )

    assertThat(txRow["id"].toString()).isEqualTo(investmentId.toString())
    assertThat(txRow["container_id"].toString()).isEqualTo(request.containerId.toString())
    assertThat(txRow["date"].toString()).isEqualTo(request.date.toString())
    assertThat(txRow["type"]).isEqualTo("buy")
    assertThat(txRow["asset_id"].toString()).isEqualTo(request.assetId.toString())
    assertThat(txRow["quantity"] as BigDecimal).isEqualByComparingTo(request.quantity)
    assertThat(txRow["amount"] as BigDecimal).isEqualByComparingTo(request.amount)
    assertThat(txRow["currency"]).isEqualTo("USD")
    assertThat(txRow["fees_amount"] as BigDecimal).isEqualByComparingTo(request.feesAmount)
    assertThat(txRow["fees_currency"]).isEqualTo("USD")
    assertThat(txRow["note"]).isEqualTo(request.note)

    val linkRow = jdbcTemplate.queryForMap(
      "select budget_period_id, category_id, linked_type, linked_id, budget_impact_amount, budget_impact_currency from budget_links where linked_id = ?",
      investmentId,
    )

    assertThat(linkRow["budget_period_id"].toString()).isEqualTo(request.budgetPeriodId.toString())
    assertThat(linkRow["category_id"].toString()).isEqualTo(request.categoryId.toString())
    assertThat(linkRow["linked_type"]).isEqualTo("investment_transaction")
    assertThat(linkRow["linked_id"].toString()).isEqualTo(investmentId.toString())
    assertThat(linkRow["budget_impact_amount"] as BigDecimal).isEqualByComparingTo(BigDecimal("251.50"))
    assertThat(linkRow["budget_impact_currency"]).isEqualTo("USD")
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

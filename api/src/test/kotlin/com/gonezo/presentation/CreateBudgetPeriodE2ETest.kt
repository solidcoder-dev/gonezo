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
import java.util.UUID

@SpringBootTest(classes = [ApiApplication::class], webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class CreateBudgetPeriodE2ETest {

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
    val resource = resourceLoader.getResource("classpath:sql/create_budget_period_setup.sql")
    val sql = resource.inputStream.bufferedReader().readText()
    jdbcTemplate.execute(sql)
  }

  @Test
  fun `creates budget period with zero totals`() {
    val restClient = RestClient.create("http://localhost:$port")

    val request = CreateBudgetPeriodRequest(
      planId = UUID.fromString("99999999-9999-9999-9999-999999999999"),
      year = 2026,
      month = 2,
      currency = "USD",
    )

    val response = restClient.post()
      .uri("/budget-periods")
      .body(request)
      .retrieve()
      .toEntity(CreateBudgetPeriodResponse::class.java)

    assertThat(response.statusCode).isEqualTo(HttpStatus.CREATED)
    val periodId = response.body!!.id

    val row = jdbcTemplate.queryForMap(
      "select id, budget_plan_id, year, month, income_total_amount, income_total_currency, remainder_amount, remainder_currency from budget_periods where id = ?",
      periodId,
    )

    assertThat(row["id"].toString()).isEqualTo(periodId.toString())
    assertThat(row["budget_plan_id"].toString()).isEqualTo(request.planId.toString())
    assertThat(row["year"]).isEqualTo(request.year)
    assertThat(row["month"]).isEqualTo(request.month)
    assertThat(row["income_total_amount"] as BigDecimal).isEqualByComparingTo(BigDecimal.ZERO)
    assertThat(row["income_total_currency"]).isEqualTo(request.currency)
    assertThat(row["remainder_amount"] as BigDecimal).isEqualByComparingTo(BigDecimal.ZERO)
    assertThat(row["remainder_currency"]).isEqualTo(request.currency)
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

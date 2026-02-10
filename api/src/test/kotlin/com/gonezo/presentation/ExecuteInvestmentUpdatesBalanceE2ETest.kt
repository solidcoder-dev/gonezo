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
class ExecuteInvestmentUpdatesBalanceE2ETest {

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
    val resource = resourceLoader.getResource("classpath:sql/execute_investment_balance_setup.sql")
    val sql = resource.inputStream.bufferedReader().readText()
    jdbcTemplate.execute(sql)
  }

  @Test
  fun `applies budget link impact to category balance`() {
    val restClient = RestClient.create("http://localhost:$port")

    val request = ExecuteInvestmentRequest(
      containerId = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
      date = LocalDate.of(2026, 2, 3),
      type = "buy",
      assetId = null,
      quantity = null,
      amount = BigDecimal("50.00"),
      currency = "USD",
      feesAmount = BigDecimal("2.00"),
      note = "test",
      budgetPeriodId = UUID.fromString("dddddddd-dddd-dddd-dddd-dddddddddddd"),
      categoryId = UUID.fromString("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"),
    )

    val response = restClient.post()
      .uri("/investments/execute")
      .body(request)
      .retrieve()
      .toEntity(ExecuteInvestmentResponse::class.java)

    assertThat(response.statusCode).isEqualTo(HttpStatus.CREATED)

    val row = jdbcTemplate.queryForMap(
      "select available_amount, safe_to_spend_amount from category_balances where id = ?",
      UUID.fromString("ffffffff-ffff-ffff-ffff-ffffffffffff"),
    )

    assertThat(row["available_amount"] as BigDecimal).isEqualByComparingTo(BigDecimal("148.00"))
    assertThat(row["safe_to_spend_amount"] as BigDecimal).isEqualByComparingTo(BigDecimal("148.00"))
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

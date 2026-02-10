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
class AllocateBudgetE2ETest {

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
    val resource = resourceLoader.getResource("classpath:sql/allocate_budget_setup.sql")
    val sql = resource.inputStream.bufferedReader().readText()
    jdbcTemplate.execute(sql)
  }

  @Test
  fun `allocates remainder across categories`() {
    val restClient = RestClient.create("http://localhost:$port")
    val periodId = UUID.fromString("cccccccc-cccc-cccc-cccc-cccccccccccc")

    val response = restClient.post()
      .uri("/budget-periods/$periodId/allocate")
      .retrieve()
      .toBodilessEntity()

    assertThat(response.statusCode).isEqualTo(HttpStatus.ACCEPTED)

    val rows = jdbcTemplate.queryForList(
      "select category_id, allocated_amount, allocated_currency, available_amount, reserved_amount, safe_to_spend_amount from category_balances where budget_period_id = ?",
      periodId,
    )

    assertThat(rows).hasSize(2)

    val byCategory = rows.associateBy { it["category_id"].toString() }
    val groceries = byCategory["dddddddd-dddd-dddd-dddd-dddddddddddd"]!!
    val rent = byCategory["eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"]!!

    assertThat(groceries["allocated_amount"] as BigDecimal).isEqualByComparingTo(BigDecimal("60.00"))
    assertThat(rent["allocated_amount"] as BigDecimal).isEqualByComparingTo(BigDecimal("40.00"))

    listOf(groceries, rent).forEach { row ->
      assertThat(row["allocated_currency"]).isEqualTo("USD")
      assertThat(row["available_amount"] as BigDecimal).isEqualByComparingTo(row["allocated_amount"] as BigDecimal)
      assertThat(row["reserved_amount"] as BigDecimal).isEqualByComparingTo(BigDecimal.ZERO)
      assertThat(row["safe_to_spend_amount"] as BigDecimal).isEqualByComparingTo(row["allocated_amount"] as BigDecimal)
    }
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

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
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.springframework.web.client.HttpClientErrorException
import org.springframework.web.client.RestClient
import org.testcontainers.containers.PostgreSQLContainer
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

@SpringBootTest(classes = [ApiApplication::class], webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class PostExpenseNegativePolicyE2ETest {

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
    val resource = resourceLoader.getResource("classpath:sql/post_expense_negative_policy_setup.sql")
    val sql = resource.inputStream.bufferedReader().readText()
    jdbcTemplate.execute(sql)
  }

  @Test
  fun `rejects expense that makes balance negative`() {
    val restClient = RestClient.create("http://localhost:$port")

    val request = PostExpenseRequest(
      accountId = UUID.fromString("11111111-1111-1111-1111-111111111111"),
      postedDate = LocalDate.of(2026, 2, 2),
      effectiveDate = LocalDate.of(2026, 2, 2),
      amount = BigDecimal("25.00"),
      currency = "USD",
      merchant = "Market",
      categoryId = UUID.fromString("cccccccc-cccc-cccc-cccc-cccccccccccc"),
      recurring = false,
      reservationId = null,
    )

    val exception = org.junit.jupiter.api.assertThrows<HttpClientErrorException> {
      restClient.post()
        .uri("/transactions/expense")
        .body(request)
        .retrieve()
        .toEntity(CreateTransactionResponse::class.java)
    }

    assertThat(exception.statusCode.value()).isEqualTo(422)

    val row = jdbcTemplate.queryForMap(
      "select spent_amount, available_amount from category_balances where id = ?",
      UUID.fromString("dddddddd-dddd-dddd-dddd-dddddddddddd"),
    )

    assertThat(row["spent_amount"] as BigDecimal).isEqualByComparingTo(BigDecimal("0.00"))
    assertThat(row["available_amount"] as BigDecimal).isEqualByComparingTo(BigDecimal("10.00"))
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

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
class PostTransferE2ETest {

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
    val resource = resourceLoader.getResource("classpath:sql/post_transfer_setup.sql")
    val sql = resource.inputStream.bufferedReader().readText()
    jdbcTemplate.execute(sql)
  }

  @Test
  fun `posts transfer and persists two transactions`() {
    val restClient = RestClient.create("http://localhost:$port")

    val request = PostTransferRequest(
      fromAccountId = UUID.fromString("11111111-1111-1111-1111-111111111111"),
      toAccountId = UUID.fromString("33333333-3333-3333-3333-333333333333"),
      postedDate = LocalDate.of(2026, 2, 2),
      effectiveDate = LocalDate.of(2026, 2, 2),
      amount = BigDecimal("250.00"),
      currency = "USD",
    )

    val response = restClient.post()
      .uri("/transactions/transfer")
      .body(request)
      .retrieve()
      .toEntity(TransferResponse::class.java)

    assertThat(response.statusCode).isEqualTo(HttpStatus.CREATED)
    val ids = response.body!!.transactionIds
    assertThat(ids).hasSize(2)

    val count = jdbcTemplate.queryForObject(
      "select count(*) from transactions where id in (?, ?)",
      Int::class.java,
      ids[0],
      ids[1],
    )
    assertThat(count).isEqualTo(2)

    val rows = jdbcTemplate.queryForList(
      "select account_id, posted_date, effective_date, amount, currency, type, merchant, category_id, recurring from transactions where id in (?, ?)",
      ids[0],
      ids[1],
    )

    assertThat(rows).hasSize(2)
    rows.forEach { row ->
      assertThat(row["posted_date"].toString()).isEqualTo(request.postedDate.toString())
      assertThat(row["effective_date"].toString()).isEqualTo(request.effectiveDate.toString())
      assertThat(row["amount"] as BigDecimal).isEqualTo(request.amount)
      assertThat(row["currency"]).isEqualTo(request.currency)
      assertThat(row["type"]).isEqualTo("transfer")
      assertThat(row["merchant"]).isNull()
      assertThat(row["category_id"]).isNull()
      assertThat(row["recurring"]).isEqualTo(false)
    }

    val accountIds = rows.map { it["account_id"].toString() }.toSet()
    assertThat(accountIds).containsExactlyInAnyOrder(
      request.fromAccountId.toString(),
      request.toAccountId.toString(),
    )
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

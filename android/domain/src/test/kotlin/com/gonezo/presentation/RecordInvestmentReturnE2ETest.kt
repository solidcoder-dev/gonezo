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
class RecordInvestmentReturnE2ETest {

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
    val resource = resourceLoader.getResource("classpath:sql/record_investment_return_setup.sql")
    val sql = resource.inputStream.bufferedReader().readText()
    jdbcTemplate.execute(sql)
  }

  @Test
  fun `records investment return`() {
    val restClient = RestClient.create("http://localhost:$port")

    val request = RecordInvestmentReturnRequest(
      containerId = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
      date = LocalDate.of(2026, 2, 3),
      amount = BigDecimal("12.34"),
      currency = "USD",
      note = "dividend",
    )

    val response = restClient.post()
      .uri("/investments/returns")
      .body(request)
      .retrieve()
      .toEntity(RecordInvestmentReturnResponse::class.java)

    assertThat(response.statusCode).isEqualTo(HttpStatus.CREATED)
    val investmentId = response.body!!.id

    val row = jdbcTemplate.queryForMap(
      "select id, container_id, date, type, amount, currency, note from investment_transactions where id = ?",
      investmentId,
    )

    assertThat(row["id"].toString()).isEqualTo(investmentId.toString())
    assertThat(row["container_id"].toString()).isEqualTo(request.containerId.toString())
    assertThat(row["date"].toString()).isEqualTo(request.date.toString())
    assertThat(row["type"]).isEqualTo("dividend")
    assertThat(row["amount"] as BigDecimal).isEqualByComparingTo(request.amount)
    assertThat(row["currency"]).isEqualTo("USD")
    assertThat(row["note"]).isEqualTo(request.note)
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

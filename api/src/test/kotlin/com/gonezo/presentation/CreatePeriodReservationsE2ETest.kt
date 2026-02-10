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
import java.util.UUID

@SpringBootTest(classes = [ApiApplication::class], webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class CreatePeriodReservationsE2ETest {

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
    val resource = resourceLoader.getResource("classpath:sql/create_period_reservations_setup.sql")
    val sql = resource.inputStream.bufferedReader().readText()
    jdbcTemplate.execute(sql)
  }

  @Test
  fun `creates reservations for active patterns`() {
    val restClient = RestClient.create("http://localhost:$port")
    val periodId = UUID.fromString("cccccccc-cccc-cccc-cccc-cccccccccccc")

    val response = restClient.post()
      .uri("/budget-periods/$periodId/reservations")
      .retrieve()
      .toBodilessEntity()

    assertThat(response.statusCode).isEqualTo(HttpStatus.ACCEPTED)

    val rows = jdbcTemplate.queryForList(
      "select pattern_id, amount, currency, status, expected_effective_date from budget_reservations where budget_period_id = ?",
      periodId,
    )

    assertThat(rows).hasSize(2)

    val byPattern = rows.associateBy { it["pattern_id"].toString() }
    val electric = byPattern["11111111-1111-1111-1111-111111111111"]!!
    val stream = byPattern["22222222-2222-2222-2222-222222222222"]!!

    assertThat(electric["amount"].toString()).isEqualTo("50.00")
    assertThat(stream["amount"].toString()).isEqualTo("15.00")
    assertThat(electric["currency"]).isEqualTo("USD")
    assertThat(stream["currency"]).isEqualTo("USD")
    assertThat(electric["status"]).isEqualTo("active")
    assertThat(stream["status"]).isEqualTo("active")
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

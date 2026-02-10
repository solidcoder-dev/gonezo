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
class ClosePeriodE2ETest {

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
    val resource = resourceLoader.getResource("classpath:sql/close_period_setup.sql")
    val sql = resource.inputStream.bufferedReader().readText()
    jdbcTemplate.execute(sql)
  }

  @Test
  fun `closes period by cancelling active reservations`() {
    val restClient = RestClient.create("http://localhost:$port")
    val periodId = UUID.fromString("cccccccc-cccc-cccc-cccc-cccccccccccc")

    val response = restClient.post()
      .uri("/budget-periods/$periodId/close")
      .retrieve()
      .toBodilessEntity()

    assertThat(response.statusCode).isEqualTo(HttpStatus.ACCEPTED)

    val rows = jdbcTemplate.queryForList(
      "select id, status from budget_reservations where budget_period_id = ? order by id",
      periodId,
    )

    assertThat(rows).hasSize(2)
    val byId = rows.associateBy { it["id"].toString() }

    assertThat(byId["eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"]!!["status"]).isEqualTo("cancelled")
    assertThat(byId["ffffffff-ffff-ffff-ffff-ffffffffffff"]!!["status"]).isEqualTo("settled")

    val balanceRow = jdbcTemplate.queryForMap(
      "select reserved_amount, safe_to_spend_amount from category_balances where id = ?",
      UUID.fromString("99999999-9999-9999-9999-999999999999"),
    )
    assertThat(balanceRow["reserved_amount"].toString()).isEqualTo("0.00")
    assertThat(balanceRow["safe_to_spend_amount"].toString()).isEqualTo("100.00")
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

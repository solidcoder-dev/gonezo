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
class SettleReservationE2ETest {

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
    val resource = resourceLoader.getResource("classpath:sql/settle_reservation_setup.sql")
    val sql = resource.inputStream.bufferedReader().readText()
    jdbcTemplate.execute(sql)
  }

  @Test
  fun `settles reservation and links transaction`() {
    val restClient = RestClient.create("http://localhost:$port")
    val reservationId = UUID.fromString("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee")
    val transactionId = UUID.fromString("ffffffff-ffff-ffff-ffff-ffffffffffff")

    val response = restClient.post()
      .uri("/reservations/$reservationId/settle")
      .body(SettleReservationRequest(transactionId))
      .retrieve()
      .toBodilessEntity()

    assertThat(response.statusCode).isEqualTo(HttpStatus.NO_CONTENT)

    val row = jdbcTemplate.queryForMap(
      "select status, linked_transaction_id from budget_reservations where id = ?",
      reservationId,
    )

    assertThat(row["status"]).isEqualTo("settled")
    assertThat(row["linked_transaction_id"].toString()).isEqualTo(transactionId.toString())

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

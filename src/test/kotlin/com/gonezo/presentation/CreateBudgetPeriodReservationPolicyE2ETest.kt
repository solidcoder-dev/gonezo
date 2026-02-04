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
class CreateBudgetPeriodReservationPolicyE2ETest {

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
    val resource = resourceLoader.getResource("classpath:sql/create_budget_period_reservations_policy_setup.sql")
    val sql = resource.inputStream.bufferedReader().readText()
    jdbcTemplate.execute(sql)
  }

  @Test
  fun `creates reservations at period start when policy enabled`() {
    val restClient = RestClient.create("http://localhost:$port")

    val request = CreateBudgetPeriodRequest(
      planId = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
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

    val reservations = jdbcTemplate.queryForList(
      "select pattern_id, amount from budget_reservations where budget_period_id = ?",
      periodId,
    )
    assertThat(reservations).hasSize(2)

    val balances = jdbcTemplate.queryForList(
      "select reserved_amount from category_balances where budget_period_id = ?",
      periodId,
    )
    assertThat(balances).hasSize(2)
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

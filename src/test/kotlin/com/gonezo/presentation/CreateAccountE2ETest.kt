package com.gonezo.presentation

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.client.TestRestTemplate
import org.springframework.core.io.ResourceLoader
import org.springframework.http.HttpStatus
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.testcontainers.containers.PostgreSQLContainer
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import java.util.UUID

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class CreateAccountE2ETest {

  @Autowired
  private lateinit var restTemplate: TestRestTemplate

  @Autowired
  private lateinit var jdbcTemplate: JdbcTemplate

  @Autowired
  private lateinit var resourceLoader: ResourceLoader

  @BeforeEach
  fun setup() {
    val resource = resourceLoader.getResource("classpath:sql/create_account_setup.sql")
    val sql = resource.inputStream.bufferedReader().readText()
    jdbcTemplate.execute(sql)
  }

  @Test
  fun `creates account and persists it`() {
    val request = CreateAccountRequest(
      userId = UUID.randomUUID(),
      name = "Primary Checking",
      type = "bank",
      currency = "USD",
    )

    val response = restTemplate.postForEntity("/accounts", request, CreateAccountResponse::class.java)

    assertThat(response.statusCode).isEqualTo(HttpStatus.CREATED)
    val accountId = response.body!!.id

    val row = jdbcTemplate.queryForMap("select id, user_id, name, type, currency from accounts where id = ?", accountId)

    assertThat(row["id"].toString()).isEqualTo(accountId.toString())
    assertThat(row["user_id"].toString()).isEqualTo(request.userId.toString())
    assertThat(row["name"]).isEqualTo(request.name)
    assertThat(row["type"]).isEqualTo(request.type)
    assertThat(row["currency"]).isEqualTo(request.currency)
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

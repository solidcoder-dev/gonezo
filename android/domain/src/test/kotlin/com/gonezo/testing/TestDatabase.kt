package com.gonezo.testing

import org.flywaydb.core.Flyway
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.jdbc.datasource.DriverManagerDataSource
import java.nio.file.Files
import java.nio.file.Path
import java.util.UUID
import javax.sql.DataSource

class TestDatabase {
  private val dbPath: Path = Files.createTempFile("gonezo-test-${UUID.randomUUID()}", ".db")

  val dataSource: DataSource = DriverManagerDataSource("jdbc:sqlite:${dbPath.toAbsolutePath()}")
  val jdbcTemplate = JdbcTemplate(dataSource)
  val namedJdbcTemplate = NamedParameterJdbcTemplate(dataSource)

  private val flyway = Flyway.configure()
    .dataSource(dataSource)
    .locations("classpath:db/migration")
    .load()

  fun migrate() {
    jdbcTemplate.execute("PRAGMA foreign_keys = ON")
    flyway.clean()
    flyway.migrate()
  }

  fun executeSqlResource(resourcePath: String) {
    val resource = requireNotNull(javaClass.classLoader.getResource(resourcePath)) {
      "Missing test SQL resource: $resourcePath"
    }
    val sql = resource.readText()
    val statements = sql.split(';')
      .map { it.trim() }
      .filter { it.isNotEmpty() }

    statements.forEach { jdbcTemplate.execute(it) }
  }

  fun close() {
    Files.deleteIfExists(dbPath)
  }
}

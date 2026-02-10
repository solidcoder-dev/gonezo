package com.gonezo.testing

import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach

abstract class SqliteE2ETest {
  protected lateinit var db: TestDatabase
  protected lateinit var app: TestApp

  protected open fun sqlResources(): List<String> = emptyList()

  @BeforeEach
  fun setupDb() {
    db = TestDatabase()
    db.migrate()
    sqlResources().forEach { db.executeSqlResource(it) }
    app = TestApp(db)
  }

  @AfterEach
  fun cleanupDb() {
    db.close()
  }
}

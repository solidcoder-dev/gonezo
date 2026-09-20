package com.gonezo.multiplatform.core

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.json.JSONObject

@RunWith(AndroidJUnit4::class)
class AndroidMacroAnalyticsPersistenceTest {
  private lateinit var context: Context
  private lateinit var databaseName: String
  private lateinit var database: CoreDatabase

  @Before
  fun setUp() {
    context = ApplicationProvider.getApplicationContext()
    databaseName = "gonezo-macro-analytics-${System.nanoTime()}.db"
    database = CoreDatabase(context, databaseName)
  }

  @After
  fun tearDown() {
    database.close()
    context.deleteDatabase(databaseName)
  }

  @Test
  fun identityAndOutboxSurviveRepositoryReconstructionAndRemainOwnerScoped() {
    val identity = AndroidMacroAnalyticsContributorRepository(database)
    identity.save("owner-a", "contributor-a")
    identity.save("owner-a", "contributor-a")
    assertEquals("contributor-a", AndroidMacroAnalyticsContributorRepository(database).get("owner-a"))
    assertNull(identity.get("owner-b"))

    val outbox = AndroidMacroAnalyticsOutboxRepository(database)
    outbox.save("owner-a", publication("2026-10", 1))
    outbox.save("owner-a", publication("2026-09", 1))
    outbox.save("owner-a", publication("2026-10", 2))
    outbox.save("owner-b", publication("2026-09", 1))

    val reopenedDatabase = CoreDatabase(context, databaseName)
    val reopened = AndroidMacroAnalyticsOutboxRepository(reopenedDatabase)
    assertEquals(2, JSONObject(reopened.get("owner-a", "2026-10")!!).getInt("revision"))
    assertEquals(listOf("2026-09", "2026-10"), reopened.listPending("owner-a").map { JSONObject(it).getJSONObject("period").getString("value") })
    reopened.remove("owner-a", "2026-09")
    assertNull(reopened.get("owner-a", "2026-09"))
    assertEquals(1, JSONObject(reopened.get("owner-b", "2026-09")!!).getInt("revision"))
    AndroidMacroAnalyticsLatestPublicationRepository(database).save(publication("2026-10", 2))
    val latestAfterReconstruction = AndroidMacroAnalyticsLatestPublicationRepository(reopenedDatabase)
    assertEquals(2, JSONObject(latestAfterReconstruction.find("contributor-a", "2026-10")!!).getInt("revision"))
    assertNull(latestAfterReconstruction.find("contributor-b", "2026-10"))
    assertNull(latestAfterReconstruction.find("contributor-a", "2026-09"))
    reopened.clear("owner-a")
    assertEquals(0, reopened.listPending("owner-a").size)
    assertEquals(1, reopened.listPending("owner-b").size)
    reopenedDatabase.close()
  }

  @Test
  fun portableResetClearsDerivedMacroStateAndPreservesContributorIdentity() {
    AndroidMacroAnalyticsContributorRepository(database).save("owner-a", "contributor-a")
    AndroidMacroAnalyticsOutboxRepository(database).save("owner-a", publication("2026-09", 1))
    AndroidMacroAnalyticsLatestPublicationRepository(database).save(publication("2026-09", 1))
    val rebuilds = AndroidMacroAnalyticsRebuildRepository(database)
    rebuilds.enqueue("owner-a", "2026-09")
    rebuilds.markInitialBackfillComplete("owner-a", 1)

    database.clearPortableState()

    assertEquals("contributor-a", AndroidMacroAnalyticsContributorRepository(database).get("owner-a"))
    assertNull(AndroidMacroAnalyticsOutboxRepository(database).get("owner-a", "2026-09"))
    assertNull(AndroidMacroAnalyticsLatestPublicationRepository(database).find("contributor-a", "2026-09"))
    assertEquals(emptyList<String>(), AndroidMacroAnalyticsRebuildRepository(database).list("owner-a"))
    assertEquals(0, AndroidMacroAnalyticsRebuildRepository(database).getInitialBackfillVersion("owner-a"))
  }

  @Test
  fun rebuildPeriodsAndBackfillStateSurviveRepositoryReconstructionAndStayOrdered() {
    val rebuilds = AndroidMacroAnalyticsRebuildRepository(database)
    rebuilds.enqueue("owner-a", "2026-10")
    rebuilds.enqueue("owner-a", "2026-09")
    rebuilds.enqueue("owner-a", "2026-09")
    rebuilds.markInitialBackfillComplete("owner-a", 1)
    rebuilds.requestFullRebuild("owner-a")
    val firstRequestVersion = rebuilds.getFullRebuildRequestVersion("owner-a")
    rebuilds.requestFullRebuild("owner-a")

    val reopenedDatabase = CoreDatabase(context, databaseName)
    val reopened = AndroidMacroAnalyticsRebuildRepository(reopenedDatabase)
    assertEquals(listOf("2026-09", "2026-10"), reopened.list("owner-a"))
    assertEquals(1, reopened.getInitialBackfillVersion("owner-a"))
    assertEquals(true, reopened.isFullRebuildRequested("owner-a"))
    assertEquals(firstRequestVersion + 1, reopened.getFullRebuildRequestVersion("owner-a"))
    reopened.clearFullRebuildRequest("owner-a", firstRequestVersion)
    assertEquals(true, reopened.isFullRebuildRequested("owner-a"))
    reopened.clearFullRebuildRequest("owner-a", firstRequestVersion + 1)
    assertEquals(false, reopened.isFullRebuildRequested("owner-a"))
    reopened.remove("owner-a", "2026-09")
    assertEquals(listOf("2026-10"), reopened.list("owner-a"))
    reopenedDatabase.close()
  }

  @Test
  fun latestPublicationReplacementKeepsOnlyTheCurrentRevisionPerContributorAndPeriod() {
    val repository = AndroidMacroAnalyticsLatestPublicationRepository(database)
    repository.save(publication("2026-09", 1))
    repository.save(publication("2026-09", 2))
    repository.save(publication("2026-10", 1).replace("contributor-a", "contributor-b"))

    assertEquals(2, JSONObject(repository.find("contributor-a", "2026-09")!!).getInt("revision"))
    assertEquals(1, JSONObject(repository.find("contributor-b", "2026-10")!!).getInt("revision"))
    assertNull(repository.find("contributor-a", "2026-10"))
  }

  @Test
  fun latestPublicationListFiltersByPeriodAndReturnsOnlyStoredCurrentRevisions() {
    val repository = AndroidMacroAnalyticsLatestPublicationRepository(database)
    repository.save(publication("2026-09", 1))
    repository.save(publication("2026-09", 2))
    repository.save(publication("2026-10", 1).replace("contributor-a", "contributor-b"))

    assertEquals(listOf(2), repository.list("2026-09").map { JSONObject(it).getInt("revision") })
    assertEquals(listOf(1), repository.list("2026-10").map { JSONObject(it).getInt("revision") })
    assertEquals(emptyList<String>(), repository.list("2026-11"))
  }

  @Test
  fun version39UpgradeAddsFullRebuildRequestVersionWithoutLosingPendingState() {
    database.writableDatabase.execSQL("drop table macro_analytics_rebuild_state")
    database.writableDatabase.execSQL("create table macro_analytics_rebuild_state (owner_id text primary key, initial_backfill_version integer not null default 0, full_rebuild_requested integer not null default 0)")
    database.writableDatabase.execSQL("insert into macro_analytics_rebuild_state(owner_id,initial_backfill_version,full_rebuild_requested) values ('owner-a',1,1)")
    database.writableDatabase.version = 39
    database.close()

    database = CoreDatabase(context, databaseName)
    val repository = AndroidMacroAnalyticsRebuildRepository(database)

    assertEquals(40, database.writableDatabase.version)
    assertEquals(1, repository.getInitialBackfillVersion("owner-a"))
    assertEquals(true, repository.isFullRebuildRequested("owner-a"))
    assertEquals(0, repository.getFullRebuildRequestVersion("owner-a"))
  }

  @Test
  fun version37UpgradePreservesLedgerAndOtherTablesAndPassesIntegrityChecks() {
    database.writableDatabase.execSQL("insert into ledger_accounts(id,name,type,currency,status,created_at) values ('a1','Cash','cash','EUR','active','2026-01-01T00:00:00Z')")
    database.writableDatabase.execSQL("insert into ledger_transactions(id,account_id,type,amount,currency,occurred_at,status) values ('t1','a1','expense','12.50','EUR','2026-01-02T00:00:00Z','posted')")
    database.writableDatabase.execSQL("insert into notifications(id,owner_id,type,deduplication_key,source_type,source_id,origin_occurrence_id,subject,occurred_at,created_at) values ('n1','owner','scheduled_processing_failed','key','scheduled','s1','o1','subject','2026-01-01T00:00:00Z','2026-01-01T00:00:00Z')")
    database.writableDatabase.execSQL("drop table macro_analytics_latest_publications")
    database.writableDatabase.execSQL("drop table macro_analytics_outbox")
    database.writableDatabase.execSQL("drop table macro_analytics_contributors")
    database.writableDatabase.version = 37
    database.close()

    database = CoreDatabase(context, databaseName)
    val sqlite = database.writableDatabase

    assertEquals(40, sqlite.version)
    assertEquals(1, sqlite.rawQuery("select count(*) from ledger_accounts where id='a1'", null).use { it.moveToFirst(); it.getInt(0) })
    assertEquals(1, sqlite.rawQuery("select count(*) from ledger_transactions where id='t1'", null).use { it.moveToFirst(); it.getInt(0) })
    assertEquals(1, sqlite.rawQuery("select count(*) from notifications where id='n1'", null).use { it.moveToFirst(); it.getInt(0) })
    assertEquals("ok", sqlite.rawQuery("pragma integrity_check", null).use { it.moveToFirst(); it.getString(0) })
    assertEquals(false, sqlite.rawQuery("pragma foreign_key_check", null).use { it.moveToFirst() })
  }

  private fun publication(period: String, revision: Int): String = """
    {"protocolVersion":1,"contributorId":"contributor-a","period":{"kind":"YEAR_MONTH","value":"$period"},"revision":$revision,
    "contribution":{"schemaVersion":1,"period":{"kind":"YEAR_MONTH","value":"$period"},"dimensions":{"countryCode":"ES","regionCode":"ES-CN","sex":"FEMALE","ageBand":"25_34"},"financial":{"currencies":[]}}}
  """.trimIndent()
}

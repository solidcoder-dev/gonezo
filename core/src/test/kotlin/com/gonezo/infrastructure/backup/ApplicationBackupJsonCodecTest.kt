package com.gonezo.infrastructure.backup

import com.gonezo.application.backup.contract.ApplicationBackupDocument
import com.gonezo.application.backup.contract.BackupErrorCode
import com.gonezo.application.backup.contract.BackupImportException
import com.gonezo.application.backup.contract.BackupSectionId
import com.gonezo.application.backup.contract.BackupFormatDescriptor
import com.gonezo.application.backup.contract.RegisteredBackupFormatRegistry
import com.gonezo.application.backup.contract.currentBackupFormatRegistry
import com.gonezo.application.orchestration.backup.AnalyticsBackupSection
import com.gonezo.application.orchestration.backup.BackupAccount
import com.gonezo.application.orchestration.backup.BackupCategory
import com.gonezo.application.orchestration.backup.BackupPostedMovement
import com.gonezo.application.orchestration.backup.BackupSharingPerson
import com.gonezo.application.orchestration.backup.BackupSplitItem
import com.gonezo.application.orchestration.backup.BackupTag
import com.gonezo.application.orchestration.backup.LedgerBackupSection
import com.gonezo.application.orchestration.backup.PreferencesBackupSection
import com.gonezo.application.orchestration.backup.SharingBackupSection
import com.gonezo.application.orchestration.backup.TaxonomyBackupSection
import com.gonezo.expected.application.backup.ExpectedBackupSection
import com.gonezo.recurrence.application.backup.RecurrenceBackupSection
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import java.time.Instant

private data class TestBackupSection(val value: String) : com.gonezo.application.backup.contract.BackupSection {
    override val sectionId = BackupSectionId.TAXONOMY
    override val version = 1
}

private data class TestBudgetsSection(val value: String) : com.gonezo.application.backup.contract.BackupSection {
    override val sectionId = BackupSectionId("budgets")
    override val version = 1
}

private class TestBudgetsSectionCodec : BackupSectionCodec<TestBudgetsSection> {
    override val sectionId = BackupSectionId("budgets")
    override val supportedVersions = setOf(1)
    override fun encode(section: TestBudgetsSection) = org.json.JSONObject().put("version", 1).put("data", org.json.JSONObject().put("value", section.value))
    override fun decode(version: Int, data: org.json.JSONObject) = TestBudgetsSection(data.getString("value"))
}

private class TestBackupSectionCodec : BackupSectionCodec<TestBackupSection> {
    override val sectionId = BackupSectionId.TAXONOMY
    override val supportedVersions = setOf(1)
    override fun encode(section: TestBackupSection) = org.json.JSONObject().put("version", 1).put("data", org.json.JSONObject().put("value", section.value))
    override fun decode(version: Int, data: org.json.JSONObject) = TestBackupSection(data.getString("value"))
}

class ApplicationBackupJsonCodecTest {
    private val codec = ApplicationBackupJsonCodec()

    @Test
    fun `round trips typed sections and preserves split item category`() {
        val taxonomy = TaxonomyBackupSection(
            categories = listOf(BackupCategory("category-1", "Food", "expense", "active")),
            tags = listOf(BackupTag("tag-1", "Home", "active")),
        )
        val ledger = LedgerBackupSection(
            accounts = listOf(BackupAccount("account-1", "Main", "cash", "EUR", "active")),
            movements = listOf(
                BackupPostedMovement(
                    "movement-1", "account-1", "expense", "posted", Instant.parse("2026-01-01T00:00:00Z"), "12.50", "EUR", null, null, "category-1", null,
                    listOf(BackupSplitItem("item-1", "Lunch", "12.50", "EUR", null, "category-1")), listOf("tag-1"),
                ),
            ),
        )
        val document = ApplicationBackupDocument(
            "gonezo-backup",
            1,
            Instant.parse("2026-01-02T00:00:00Z"),
            mapOf(
                BackupSectionId.TAXONOMY to taxonomy,
                BackupSectionId.LEDGER to ledger,
                BackupSectionId.RECURRENCE to RecurrenceBackupSection(emptyList(), emptyList()),
                BackupSectionId.EXPECTED to ExpectedBackupSection(emptyList()),
                BackupSectionId.SHARING to SharingBackupSection(listOf(BackupSharingPerson("person-1", "Alex", "alex", "2026-01-01T00:00:00Z", null)), emptyList(), emptyList(), emptyList()),
                BackupSectionId.ANALYTICS to AnalyticsBackupSection(emptyList()),
                BackupSectionId.PREFERENCES to PreferencesBackupSection(null),
            ),
        )

        val restored = codec.decode(codec.encode(document))

        assertThat((restored.sections.getValue(BackupSectionId.LEDGER) as LedgerBackupSection).movements.single().splitItems.single().categoryId)
            .isEqualTo("category-1")
        assertThat(codec.encode(document)).contains("\n  \"format\"")
        assertThat(codec.encode(document)).contains("\"postedMovements\"").doesNotContain("\"recurringPlans\"")
        assertThat(codec.encode(document)).contains("\"name\": \"Alex\"").doesNotContain("\"displayName\"")
    }

    @Test
    fun `rejects a section whose declared version does not match its typed payload`() {
        val json = """
            {"format":"gonezo-backup","formatVersion":1,"createdAt":"2026-01-01T00:00:00Z","sections":{"taxonomy":{"version":2,"data":{"categories":[],"tags":[]}},"ledger":{"version":1,"data":{"accounts":[],"movements":[]}},"recurrence":{"version":1,"data":{"movements":[],"occurrences":[]}},"expected":{"version":1,"data":{"movements":[]}},"sharing":{"version":1,"data":{"persons":[],"expenseShares":[],"recurringPlans":[],"plannedShares":[]}},"analytics":{"version":1,"data":{"exclusions":[]}},"preferences":{"version":1,"data":{}}}}
        """.trimIndent()

        assertThatThrownBy { codec.decode(json) }.isInstanceOf(BackupImportException::class.java)
            .extracting("code").isEqualTo(BackupErrorCode.UNSUPPORTED_SECTION_VERSION)
    }

    @Test
    fun `decodes the canonical all-section fixture`() {
        val fixture = requireNotNull(javaClass.getResource("/application-backup-v1.json")).readText()

        val document = codec.decode(fixture)

        assertThat(document.sections.keys).containsExactlyInAnyOrder(
            BackupSectionId.TAXONOMY, BackupSectionId.LEDGER, BackupSectionId.RECURRENCE,
            BackupSectionId.EXPECTED, BackupSectionId.SHARING, BackupSectionId.ANALYTICS, BackupSectionId.PREFERENCES,
        )
    }

    @Test
    fun `canonical fixture preserves cross-section references`() {
        val document = codec.decode(requireNotNull(javaClass.getResource("/application-backup-v1.json")).readText())
        val taxonomy = document.sections.getValue(BackupSectionId.TAXONOMY) as TaxonomyBackupSection
        val ledger = document.sections.getValue(BackupSectionId.LEDGER) as LedgerBackupSection
        val recurrence = document.sections.getValue(BackupSectionId.RECURRENCE) as RecurrenceBackupSection
        val expected = document.sections.getValue(BackupSectionId.EXPECTED) as ExpectedBackupSection
        val sharing = document.sections.getValue(BackupSectionId.SHARING) as SharingBackupSection
        val preferences = document.sections.getValue(BackupSectionId.PREFERENCES) as PreferencesBackupSection

        assertThat(taxonomy.categories).hasSize(1)
        assertThat(taxonomy.tags).hasSize(1)
        assertThat(ledger.accounts).hasSize(1)
        val movement = ledger.movements.single()
        assertThat(movement.accountId).isEqualTo(ledger.accounts.single().id)
        assertThat(movement.categoryId).isEqualTo(taxonomy.categories.single().id)
        assertThat(movement.tagIds).containsExactly(taxonomy.tags.single().id)
        assertThat(movement.splitItems).hasSize(2)
        movement.splitItems.forEach { assertThat(it.categoryId).isEqualTo(taxonomy.categories.single().id) }
        assertThat(expected.movements.single().originRecurringMovementId).isEqualTo(recurrence.movements.single().id)
        assertThat(expected.movements.single().splitItems.single().sourceTemplateItemId).isEqualTo(recurrence.movements.single().splitItems.single().id)
        assertThat(sharing.expenseShares.single().sourceTransactionId).isEqualTo(ledger.movements.single().id)
        assertThat(sharing.plannedShares.single().expectedMovementId).isEqualTo(expected.movements.single().id)
        assertThat(sharing.recurringPlans.single().recurringMovementId).isEqualTo(recurrence.movements.single().id)
        assertThat(preferences.defaultAccountId).isEqualTo(ledger.accounts.single().id)
    }

    @Test
    fun `root codec round trips a section added only through registry composition`() {
        val codec = ApplicationBackupJsonCodec(
            BackupSectionCodecRegistry(listOf(TestBackupSectionCodec())),
            RegisteredBackupFormatRegistry(listOf(BackupFormatDescriptor(1, setOf(BackupSectionId.TAXONOMY)))),
        )
        val document = com.gonezo.application.backup.contract.ApplicationBackupDocument("gonezo-backup", 1, Instant.EPOCH, mapOf(BackupSectionId.TAXONOMY to TestBackupSection("registered")))

        assertThat((codec.decode(codec.encode(document)).sections.getValue(BackupSectionId.TAXONOMY) as TestBackupSection).value).isEqualTo("registered")
    }

    @Test
    fun `v1 does not require a future budgets section`() {
        val futureCodec = BackupSectionCodecRegistry(defaultBackupSectionCodecRegistryCodecs() + TestBudgetsSectionCodec())

        val document = ApplicationBackupJsonCodec(futureCodec).decode(requireNotNull(javaClass.getResource("/application-backup-v1.json")).readText())

        assertThat(document.sections).doesNotContainKey(BackupSectionId("budgets"))
    }

    @Test
    fun `v2 requires budgets and rejects it without a codec`() {
        val v2 = BackupFormatDescriptor(2, currentBackupFormatRegistry().resolve(1).requiredSections + BackupSectionId("budgets"))
        val rootRegistry = RegisteredBackupFormatRegistry(listOf(currentBackupFormatRegistry().resolve(1), v2))
        val fixture = org.json.JSONObject(requireNotNull(javaClass.getResource("/application-backup-v1.json")).readText()).put("formatVersion", 2)

        assertThatThrownBy { ApplicationBackupJsonCodec(defaultBackupSectionCodecRegistry(), rootRegistry).decode(fixture.toString()) }
            .isInstanceOf(BackupImportException::class.java)
            .extracting("code").isEqualTo(BackupErrorCode.MISSING_SECTION)
    }

    @Test
    fun `v2 with budgets rejects when the budgets codec is unavailable`() {
        val budgets = BackupSectionId("budgets")
        val v2 = BackupFormatDescriptor(2, currentBackupFormatRegistry().resolve(1).requiredSections + budgets)
        val rootRegistry = RegisteredBackupFormatRegistry(listOf(currentBackupFormatRegistry().resolve(1), v2))
        val root = org.json.JSONObject(requireNotNull(javaClass.getResource("/application-backup-v1.json")).readText()).put("formatVersion", 2)
        root.getJSONObject("sections").put("budgets", org.json.JSONObject().put("version", 1).put("data", org.json.JSONObject().put("value", "empty")))

        assertThatThrownBy { ApplicationBackupJsonCodec(defaultBackupSectionCodecRegistry(), rootRegistry).decode(root.toString()) }
            .isInstanceOf(BackupImportException::class.java)
    }

    @Test
    fun `v2 with a registered budgets codec decodes successfully`() {
        val budgets = BackupSectionId("budgets")
        val v2 = BackupFormatDescriptor(2, currentBackupFormatRegistry().resolve(1).requiredSections + budgets)
        val rootRegistry = RegisteredBackupFormatRegistry(listOf(currentBackupFormatRegistry().resolve(1), v2))
        val root = org.json.JSONObject(requireNotNull(javaClass.getResource("/application-backup-v1.json")).readText()).put("formatVersion", 2)
        root.getJSONObject("sections").put("budgets", org.json.JSONObject().put("version", 1).put("data", org.json.JSONObject().put("value", "empty")))
        val codecs = BackupSectionCodecRegistry(defaultBackupSectionRegistryCodecs() + TestBudgetsSectionCodec())

        assertThat(ApplicationBackupJsonCodec(codecs, rootRegistry).decode(root.toString()).sections[budgets])
            .isEqualTo(TestBudgetsSection("empty"))
    }

    @Test
    fun `root v1 accepts a supported sharing schema v2`() {
        val root = org.json.JSONObject(requireNotNull(javaClass.getResource("/application-backup-v1.json")).readText())
        root.getJSONObject("sections").getJSONObject("sharing").put("version", 2)
        val sharingV2 = object : BackupSectionCodec<SharingBackupSection> {
            override val sectionId = BackupSectionId.SHARING
            override val supportedVersions = setOf(2)
            override fun encode(section: SharingBackupSection) = SharingBackupSectionCodec().encode(section)
            override fun decode(version: Int, data: org.json.JSONObject) = SharingBackupSectionCodec().decode(1, data)
        }

        assertThat(ApplicationBackupJsonCodec(BackupSectionCodecRegistry(defaultBackupSectionRegistryCodecs() + sharingV2)).decode(root.toString()).sections)
            .containsKey(BackupSectionId.SHARING)
    }
}

private fun defaultBackupSectionRegistryCodecs(): List<BackupSectionCodec<*>> = listOf(
    TaxonomyBackupSectionCodec(), LedgerBackupSectionCodec(), RecurrenceBackupSectionCodec(), ExpectedBackupSectionCodec(), SharingBackupSectionCodec(), AnalyticsBackupSectionCodec(), PreferencesBackupSectionCodec(),
)

private fun defaultBackupSectionCodecRegistryCodecs(): List<BackupSectionCodec<*>> = defaultBackupSectionRegistryCodecs()

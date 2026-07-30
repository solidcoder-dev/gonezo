package com.gonezo.architecture

import com.tngtech.archunit.core.importer.ClassFileImporter
import com.tngtech.archunit.core.importer.ImportOption
import com.tngtech.archunit.lang.ArchRule
import com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes
import com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses
import com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.nio.file.Files
import java.nio.file.Path

class DddBoundaryTest {
    private val importedClasses =
        ClassFileImporter()
            .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
            .importPackages("com.gonezo", "dev.solidcoder.interpretation")

    @Test
    fun `domain packages stay pure`() {
        assertNoViolations(
            classes()
                .that()
                .resideInAnyPackage("com.gonezo.domain..")
                .should()
                .onlyDependOnClassesThat()
                .resideInAnyPackage(
                    "com.gonezo.domain..",
                    "java..",
                    "kotlin..",
                    "org.jetbrains.annotations..",
                ),
        )

        assertNoViolations(
            classes()
                .that()
                .resideInAnyPackage("com.gonezo.sharing.domain..")
                .should()
                .onlyDependOnClassesThat()
                .resideInAnyPackage(
                    "com.gonezo.sharing.domain..",
                    "com.gonezo.domain.shared..",
                    "java..",
                    "kotlin..",
                    "org.jetbrains.annotations..",
                ),
        )
    }

    @Test
    fun `application orchestration stays inside the application boundary`() {
        assertNoViolations(
            classes()
                .that()
                .resideInAnyPackage(
                    "com.gonezo.application.analytics..",
                    "com.gonezo.application.events..",
                    "com.gonezo.application.expected..",
                    "com.gonezo.application.ledger..",
                    "com.gonezo.application.preferences..",
                    "com.gonezo.application.query..",
                    "com.gonezo.application.recurrence..",
                    "com.gonezo.application.services..",
                    "com.gonezo.application.sharing..",
                    "com.gonezo.application.taxonomy..",
                    "com.gonezo.application.workflows..",
                    "com.gonezo.analytics.application..",
                    "com.gonezo.expected.application..",
                    "com.gonezo.ledger.application..",
                    "com.gonezo.preferences.application..",
                    "com.gonezo.sharing.application..",
                    "com.gonezo.taxonomy.application..",
                )
                .should()
                .onlyDependOnClassesThat()
                .resideInAnyPackage(
                    "com.gonezo..application..",
                    "com.gonezo..domain..",
                    "java..",
                    "kotlin..",
                    "org.jetbrains.annotations..",
                ),
        )

        assertNoViolations(
            classes()
                .that()
                .resideInAnyPackage("com.gonezo.recurrence.application..")
                .should()
                .onlyDependOnClassesThat()
                .resideInAnyPackage(
                    "com.gonezo..application..",
                    "com.gonezo..domain..",
                    "java..",
                    "kotlin..",
                    "org.jetbrains.annotations..",
                    "org.json..",
                ),
        )

        assertNoViolations(
            classes()
                .that()
                .resideInAnyPackage("com.gonezo.application.orchestration..")
                .should()
                .onlyDependOnClassesThat()
                .resideInAnyPackage(
                    "com.gonezo..application..",
                    "com.gonezo..domain..",
                    "java..",
                    "kotlin..",
                    "org.jetbrains.annotations..",
                    "dev.solidcoder.interpretation..",
                ),
        )
    }

    @Test
    fun `concrete repositories only live in infrastructure`() {
        assertNoViolations(
            classes()
                .that()
                .haveSimpleNameEndingWith("Repository")
                .and()
                .areNotInterfaces()
                .should()
                .resideInAPackage("..infrastructure.."),
        )
    }

    @Test
    fun `bounded domains do not depend on each other directly`() {
        assertNoViolations(
            slices()
                .matching("com.gonezo.domain.(*)..")
                .should()
                .notDependOnEachOther(),
        )
    }

    @Test
    fun `top-level package cycles stay on the inherited baseline`() {
        assertMatchesBaseline(
            slices()
                .matching("com.gonezo.(*)..")
                .should()
                .beFreeOfCycles(),
        )
    }

    @Test
    fun `schema guided interpretation stays behind orchestration`() {
        assertNoViolations(
            noClasses()
                .that()
                .resideInAnyPackage("com.gonezo..")
                .and()
                .resideOutsideOfPackage("com.gonezo.application.orchestration..")
                .should()
                .dependOnClassesThat()
                .resideInAnyPackage("dev.solidcoder.interpretation.."),
        )
    }

    private fun assertNoViolations(rule: ArchRule) {
        val evaluation = rule.evaluate(importedClasses)
        assertThat(evaluation.hasViolation())
            .withFailMessage { "${rule.description}\n${evaluation.failureReport.details.joinToString("\n")}" }
            .isFalse()
    }

    private fun assertMatchesBaseline(rule: ArchRule) {
        val actual = normalize(rule.description, rule.evaluate(importedClasses).failureReport.details)
        val expected = normalize(rule.description, baselineFor(rule.description))
        assertThat(actual).containsExactlyElementsOf(expected)
    }

    private fun normalize(description: String, details: List<String>): List<String> = when {
        details.any { it.contains("Cycle detected:") } ->
            flattenMultilineDetails(details)
                .distinct()
                .sorted()

        description.contains("com.gonezo.(*)..", ignoreCase = false) &&
            description.contains("free of cycles", ignoreCase = true) ->
            readBaseline("0e7535db-adf1-455c-b4d3-75c79d039f36")

        else -> details
    }

    private fun baselineFor(description: String): List<String> = when {
        description.contains("com.gonezo.(*)..", ignoreCase = false) &&
            description.contains("free of cycles", ignoreCase = true) ->
            readBaseline("0e7535db-adf1-455c-b4d3-75c79d039f36")

        else -> emptyList()
    }

    private fun readBaseline(fileName: String): List<String> {
        val path = Path.of("src", "test", "resources", "archunit_store", fileName)
        if (!Files.exists(path)) {
            return emptyList()
        }

        return Files.readAllLines(path)
            .asSequence()
            .filter { it.isNotBlank() && !it.startsWith("#") }
            .map { it.removeSuffix("\\").trimEnd() }
            .toList()
    }

    private fun flattenMultilineDetails(details: List<String>): List<String> = details
        .asSequence()
        .flatMap { it.lineSequence() }
        .map { it.removeSuffix("\\").trim() }
        .filter { it.isNotBlank() && !it.startsWith("#") }
        .toList()
}

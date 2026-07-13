package dev.solidcoder.interpretation

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.nio.file.Files
import java.nio.file.Path
import kotlin.io.path.isRegularFile
import kotlin.io.path.readText

class SchemaGuidedInterpretationArchitectureTest {

  private val forbiddenDomainTerms = listOf(
    "Movement",
    "movement",
    "Transaction",
    "transaction",
    "Expense",
    "expense",
    "Income",
    "income",
    "Account",
    "account",
    "Category",
    "category",
    "Ledger",
    "ledger",
    "Composer",
    "composer",
    "amount",
    "categoryId",
    "occurredOn",
    "note",
    "Gonezo",
    "gonezo",
    listOf("movement", "entry").joinToString("-"),
    listOf("v", "1").joinToString(""),
    listOf("com.google.ai.edge", "litertlm").joinToString("."),
    "JsonInterpretationPromptCompiler",
    "JsonInterpretationResultDecoder",
    "DefaultInterpretationPromptCompiler",
    "fun interface InterpretationPromptCompiler",
    "fun interface InterpretationResultDecoder",
  )

  @Test
  fun `module does not import gonezo packages`() {
    assertSourceRootsDoNotContain("import com.gonezo.", "stay isolated from Gonezo packages")
  }

  @Test
  fun `module uses only generic interpretation vocabulary`() {
    assertSourceRootsDoNotContain(forbiddenDomainTerms)
  }

  @Test
  fun `module does not reference android or litertlm packages`() {
    assertSourceRootsDoNotContain(
      listOf("import ", "android", ".").joinToString(""),
      listOf("import ", "com.google.ai.edge", "litertlm", ".").joinToString(""),
      listOf("import ", "androidx", ".").joinToString(""),
    )
  }

  private fun assertSourceRootsDoNotContain(vararg forbiddenTexts: String) {
    assertSourceRootsDoNotContain(forbiddenTexts = forbiddenTexts.toList())
  }

  private fun assertSourceRootsDoNotContain(forbiddenTexts: List<String>) {
    listOf(
      Path.of("src/main/kotlin/dev/solidcoder/interpretation"),
      Path.of("src/main/resources"),
    ).forEach { root ->
      if (!Files.exists(root)) {
        return@forEach
      }

      Files.walk(root).use { paths ->
        paths
          .filter(Path::isRegularFile)
          .filter { file ->
            file.fileName.toString() != "SchemaGuidedInterpretationArchitectureTest.kt" &&
              (file.toString().endsWith(".kt") || file.toString().endsWith(".json") || file.toString().endsWith(".txt"))
          }
          .forEach { file ->
            val source = file.readText()
            forbiddenTexts.forEach { term ->
              assertThat(source)
                .describedAs("${file.toString()} should not contain '$term'")
                .doesNotContain(term)
            }
          }
      }
    }
  }
}

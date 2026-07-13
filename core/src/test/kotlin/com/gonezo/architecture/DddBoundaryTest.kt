package com.gonezo.architecture

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.nio.file.Files
import java.nio.file.Path
import kotlin.io.path.isRegularFile
import kotlin.io.path.readText

class DddBoundaryTest {

  @Test
  fun `ledger domain does not define taxonomy category identity`() {
    assertThat(Path.of("src/main/kotlin/com/gonezo/domain/ledger/CategoryId.kt")).doesNotExist()
  }

  @Test
  fun `bounded context domains do not import each other`() {
    val boundedContexts = setOf("ledger", "taxonomy", "expected", "recurrence", "preferences")
    boundedContexts.forEach { context ->
      val root = Path.of("src/main/kotlin/com/gonezo/domain/$context")
      val forbiddenImports = boundedContexts
        .filterNot { it == context }
        .map { "com.gonezo.$it." }

      Files.walk(root).use { paths ->
        paths
          .filter(Path::isRegularFile)
          .filter { it.toString().endsWith(".kt") }
          .forEach { file ->
            val text = file.readText()
            forbiddenImports.forEach { forbidden ->
              assertThat(text)
                .describedAs("${file.toString()} should not import $forbidden")
                .doesNotContain(forbidden)
            }
          }
      }
    }
  }

  @Test
  fun `domain event publisher accepts only typed domain events`() {
    val publisher = Path.of("src/main/kotlin/com/gonezo/application/events/DomainEventPublisher.kt")
      .readText()

    assertThat(publisher).contains("fun publish(event: DomainEvent)")
    assertThat(publisher).doesNotContain("event: Any")
  }

  @Test
  fun `gonezo domain does not import schema guided interpretation`() {
    val root = Path.of("src/main/kotlin/com/gonezo/domain")

    Files.walk(root).use { paths ->
      paths
        .filter(Path::isRegularFile)
        .filter { it.toString().endsWith(".kt") }
        .forEach { file ->
          assertThat(file.readText())
            .describedAs("${file.toString()} should not import schema-guided-interpretation")
            .doesNotContain("import dev.solidcoder.interpretation.")
        }
    }
  }

  @Test
  fun `schema guided interpretation is imported only from application orchestration`() {
    val root = Path.of("src/main/kotlin/com/gonezo")

    Files.walk(root).use { paths ->
      paths
        .filter(Path::isRegularFile)
        .filter { it.toString().endsWith(".kt") }
        .forEach { file ->
          val text = file.readText()
          if (text.contains("import dev.solidcoder.interpretation.")) {
            assertThat(file.toString().replace('\\', '/'))
              .describedAs("${file.toString()} should import schema-guided-interpretation only from application/orchestration")
              .contains("/application/orchestration/")
          }
        }
    }
  }
}

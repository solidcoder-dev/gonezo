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
    val boundedContexts = setOf("ledger", "taxonomy", "expected", "recurrence")
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
}

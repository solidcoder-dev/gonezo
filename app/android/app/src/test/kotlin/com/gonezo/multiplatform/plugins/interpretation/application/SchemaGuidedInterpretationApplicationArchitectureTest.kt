package com.gonezo.multiplatform.plugins.interpretation.application

import java.nio.file.Files
import java.nio.file.Path
import kotlin.io.path.isRegularFile
import kotlin.io.path.readText
import org.junit.Assert.assertFalse
import org.junit.Test

class SchemaGuidedInterpretationApplicationArchitectureTest {
  @Test
  fun applicationPackageDoesNotDependOnGonezoAdapterPackages() {
    val root = Path.of("src/main/kotlin/com/gonezo/multiplatform/plugins/interpretation/application")

    Files.walk(root).use { paths ->
      paths
        .filter(Path::isRegularFile)
        .filter { it.toString().endsWith(".kt") }
        .forEach { file ->
          val source = file.readText()
          assertFalse("application package should not import gonezo adapter packages: $file", source.contains("import com.gonezo.multiplatform.plugins.interpretation.gonezo."))
        }
    }
  }
}

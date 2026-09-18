plugins {
    kotlin("jvm") version "2.3.0"
    id("com.diffplug.spotless") version "8.8.0"
}

group = "com.gonezo"
version = "1.0.0"

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

kotlin {
    compilerOptions.jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
}

dependencies {
    implementation("org.json:json:20240303")
    testImplementation(kotlin("test"))
    testImplementation("org.junit.jupiter:junit-jupiter:5.11.4")
}

tasks.test { useJUnitPlatform() }

spotless {
    kotlin {
        target("src/**/*.kt")
        ktlint().editorConfigOverride(mapOf("max_line_length" to "720"))
        trimTrailingWhitespace()
        endWithNewline()
    }
    kotlinGradle {
        target("*.gradle.kts")
        ktlint().editorConfigOverride(mapOf("max_line_length" to "720"))
        trimTrailingWhitespace()
        endWithNewline()
    }
}

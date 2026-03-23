package com.gonezo.infrastructure.mobills

import java.math.BigDecimal
import java.nio.charset.StandardCharsets
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException

data class MobillsNormalizedRow(
  val sourceLine: Int,
  val accountName: String,
  val occurredAt: Instant,
  val value: BigDecimal,
  val currency: String,
  val description: String?,
  val merchant: String?,
  val category: String?,
  val tags: List<String>,
)

data class MobillsParseIssue(
  val lineNumber: Int,
  val code: String,
  val message: String,
)

data class MobillsParseResult(
  val rows: List<MobillsNormalizedRow>,
  val issues: List<MobillsParseIssue>,
)

class MobillsTsvParser(
  private val defaultCurrency: String = "EUR",
) {
  fun parse(bytes: ByteArray): MobillsParseResult {
    val text = String(bytes, StandardCharsets.UTF_16)
    return parseText(text)
  }

  fun parseText(text: String): MobillsParseResult {
    val lines = text
      .replace("\uFEFF", "")
      .lineSequence()
      .toList()

    val headerIndex = lines.indexOfFirst { it.isNotBlank() }
    if (headerIndex == -1) {
      return MobillsParseResult(emptyList(), emptyList())
    }

    val headers = splitTsv(lines[headerIndex]).map(::normalizeHeaderName)
    val dateCol = requireHeaderIndex(headers, "date", "fecha")
    val accountCol = requireHeaderIndex(headers, "account", "cuenta")
    val valueCol = requireHeaderIndex(headers, "value", "amount", "valor", "importe")
    val currencyCol = headerIndex(headers, "currency", "moneda")
    val descriptionCol = headerIndex(headers, "description", "descripcion", "concept", "note")
    val merchantCol = headerIndex(headers, "merchant", "counterparty", "store", "payee", "comercio")
    val categoryCol = headerIndex(headers, "category", "categoria")
    val tagsCol = headerIndex(headers, "tags", "etiquetas", "tag")

    val rows = mutableListOf<MobillsNormalizedRow>()
    val issues = mutableListOf<MobillsParseIssue>()

    for ((index, line) in lines.withIndex()) {
      if (index <= headerIndex || line.isBlank()) {
        continue
      }
      val sourceLine = index + 1
      val values = splitTsv(line)

      val occurredAt = parseDate(cell(values, dateCol))
      if (occurredAt == null) {
        issues += MobillsParseIssue(sourceLine, "INVALID_DATE", "Cannot parse date at line $sourceLine")
        continue
      }

      val accountName = cell(values, accountCol).trim()
      if (accountName.isEmpty()) {
        issues += MobillsParseIssue(sourceLine, "MISSING_ACCOUNT", "Account is required at line $sourceLine")
        continue
      }

      val rawValue = parseDecimal(cell(values, valueCol))
      if (rawValue == null) {
        issues += MobillsParseIssue(sourceLine, "INVALID_VALUE", "Cannot parse value at line $sourceLine")
        continue
      }
      if (rawValue.compareTo(BigDecimal.ZERO) == 0) {
        issues += MobillsParseIssue(sourceLine, "ZERO_VALUE", "Value cannot be zero at line $sourceLine")
        continue
      }

      val currency = currencyCol?.let { cell(values, it).trim() }
        ?.takeIf(String::isNotBlank)
        ?.uppercase()
        ?: defaultCurrency.uppercase()
      val description = descriptionCol?.let { cell(values, it).trim().ifBlank { null } }
      val merchant = merchantCol?.let { cell(values, it).trim().ifBlank { null } }
      val category = categoryCol?.let { cell(values, it).trim().ifBlank { null } }
      val tags = tagsCol?.let { parseTags(cell(values, it)) } ?: emptyList()

      rows += MobillsNormalizedRow(
        sourceLine = sourceLine,
        accountName = accountName,
        occurredAt = occurredAt,
        value = rawValue,
        currency = currency,
        description = description,
        merchant = merchant,
        category = category,
        tags = tags,
      )
    }

    return MobillsParseResult(
      rows = rows,
      issues = issues,
    )
  }

  private fun requireHeaderIndex(headers: List<String>, vararg aliases: String): Int =
    headerIndex(headers, *aliases)
      ?: throw IllegalArgumentException("Missing required Mobills column: ${aliases.first()}")

  private fun headerIndex(headers: List<String>, vararg aliases: String): Int? {
    val normalizedAliases = aliases.map(::normalizeHeaderName).toSet()
    return headers.indexOfFirst { it in normalizedAliases }.takeIf { it >= 0 }
  }

  private fun cell(values: List<String>, index: Int): String = values.getOrElse(index) { "" }

  private fun parseTags(raw: String): List<String> = raw
    .split(Regex("[|,;]"))
    .asSequence()
    .map(String::trim)
    .filter(String::isNotBlank)
    .map(String::lowercase)
    .distinct()
    .toList()

  private fun parseDecimal(raw: String): BigDecimal? {
    val trimmed = raw.trim()
    if (trimmed.isEmpty()) {
      return null
    }

    val isParenthesizedNegative = trimmed.startsWith("(") && trimmed.endsWith(")")
    val withoutParentheses = if (isParenthesizedNegative) trimmed.removeSurrounding("(", ")") else trimmed
    var normalized = withoutParentheses
      .replace(" ", "")
      .replace("\u00A0", "")
      .replace("€", "")
      .replace("$", "")
      .replace("£", "")
      .replace("+", "")

    normalized = when {
      normalized.contains(',') && normalized.contains('.') -> {
        val commaPos = normalized.lastIndexOf(',')
        val dotPos = normalized.lastIndexOf('.')
        if (commaPos > dotPos) {
          normalized.replace(".", "").replace(',', '.')
        } else {
          normalized.replace(",", "")
        }
      }
      normalized.contains(',') -> normalized.replace(',', '.')
      else -> normalized
    }

    return try {
      val parsed = BigDecimal(normalized)
      if (isParenthesizedNegative) parsed.negate() else parsed
    } catch (_: NumberFormatException) {
      null
    }
  }

  private fun parseDate(raw: String): Instant? {
    val value = raw.trim()
    if (value.isEmpty()) {
      return null
    }

    try {
      return Instant.parse(value)
    } catch (_: DateTimeParseException) {
      // noop
    }

    val dateTimeFormats = listOf(
      DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"),
      DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"),
      DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"),
      DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"),
    )
    for (formatter in dateTimeFormats) {
      try {
        return LocalDateTime.parse(value, formatter).toInstant(ZoneOffset.UTC)
      } catch (_: DateTimeParseException) {
        // noop
      }
    }

    val dateFormats = listOf(
      DateTimeFormatter.ISO_LOCAL_DATE,
      DateTimeFormatter.ofPattern("dd/MM/yyyy"),
      DateTimeFormatter.ofPattern("MM/dd/yyyy"),
    )
    for (formatter in dateFormats) {
      try {
        return LocalDate.parse(value, formatter).atStartOfDay().toInstant(ZoneOffset.UTC)
      } catch (_: DateTimeParseException) {
        // noop
      }
    }

    return null
  }

  private fun splitTsv(line: String): List<String> {
    val cells = mutableListOf<String>()
    var start = 0
    while (true) {
      val tab = line.indexOf('\t', startIndex = start)
      if (tab < 0) {
        cells += line.substring(start)
        return cells
      }
      cells += line.substring(start, tab)
      start = tab + 1
    }
  }

  private fun normalizeHeaderName(raw: String): String = raw
    .trim()
    .lowercase()
    .replace(Regex("[^a-z0-9]"), "")
}


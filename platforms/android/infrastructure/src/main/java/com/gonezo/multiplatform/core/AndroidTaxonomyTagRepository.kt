package com.gonezo.multiplatform.core

import android.content.ContentValues
import android.database.Cursor
import android.database.sqlite.SQLiteDatabase
import com.gonezo.taxonomy.domain.Tag
import com.gonezo.taxonomy.domain.TagId
import com.gonezo.taxonomy.domain.TagStatus
import com.gonezo.taxonomy.domain.ports.TagRepository
import java.time.Instant
import java.util.Locale

class AndroidTaxonomyTagRepository(
  private val db: CoreDatabase,
) : TagRepository {

  override fun save(tag: Tag) {
    val database = db.writableDatabase
    val values = ContentValues().apply {
      put("id", tag.id.toString())
      put("name", tag.name)
      put("name_normalized", tag.name.trim().lowercase(Locale.ROOT))
      put("status", tag.status.value)
      put("created_at", tag.createdAt.toString())
      if (tag.archivedAt == null) {
        putNull("archived_at")
      } else {
        put("archived_at", tag.archivedAt.toString())
      }
    }

    val result = database.insertWithOnConflict(
      "taxonomy_tags",
      null,
      values,
      SQLiteDatabase.CONFLICT_REPLACE,
    )
    check(result != -1L) { "Failed to upsert taxonomy tag: ${tag.id}" }
  }

  override fun findById(id: TagId): Tag? {
    val database = db.readableDatabase
    val cursor = database.query(
      "taxonomy_tags",
      arrayOf("id", "name", "status", "created_at", "archived_at"),
      "id = ?",
      arrayOf(id.toString()),
      null,
      null,
      null,
    )
    return cursor.use { if (it.moveToFirst()) mapTag(it) else null }
  }

  override fun findByIds(ids: Collection<TagId>): Map<TagId, Tag> {
    if (ids.isEmpty()) {
      return emptyMap()
    }

    val placeholders = ids.joinToString(",") { "?" }
    val args = ids.map { it.toString() }.toTypedArray()
    val database = db.readableDatabase
    val cursor = database.query(
      "taxonomy_tags",
      arrayOf("id", "name", "status", "created_at", "archived_at"),
      "id in ($placeholders)",
      args,
      null,
      null,
      null,
    )

    return cursor.use {
      buildMap {
        while (it.moveToNext()) {
          val tag = mapTag(it)
          put(tag.id, tag)
        }
      }
    }
  }

  override fun findByNormalizedName(name: String): Tag? {
    val database = db.readableDatabase
    val cursor = database.query(
      "taxonomy_tags",
      arrayOf("id", "name", "status", "created_at", "archived_at"),
      "name_normalized = ?",
      arrayOf(name.trim().lowercase(Locale.ROOT)),
      null,
      null,
      null,
    )
    return cursor.use { if (it.moveToFirst()) mapTag(it) else null }
  }

  override fun listAll(): List<Tag> {
    val database = db.readableDatabase
    val cursor = database.query(
      "taxonomy_tags",
      arrayOf("id", "name", "status", "created_at", "archived_at"),
      null,
      null,
      null,
      null,
      "name_normalized asc, id asc",
    )

    return cursor.use {
      buildList {
        while (it.moveToNext()) {
          add(mapTag(it))
        }
      }
    }
  }

  private fun mapTag(cursor: Cursor): Tag =
    Tag(
      id = TagId.from(cursor.getString(0)),
      name = cursor.getString(1),
      status = TagStatus.from(cursor.getString(2)),
      createdAt = Instant.parse(cursor.getString(3)),
      archivedAt = cursor.getString(4)?.let(Instant::parse),
    )
}

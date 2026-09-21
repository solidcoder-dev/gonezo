package com.gonezo.taxonomy.domain

import java.util.Locale

object TagName {
    @JvmStatic
    fun normalizeTagName(name: String): String = name.trim().lowercase(Locale.ROOT)
}

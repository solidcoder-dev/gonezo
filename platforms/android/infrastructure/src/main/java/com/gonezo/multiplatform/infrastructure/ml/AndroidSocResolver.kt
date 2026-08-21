package com.gonezo.multiplatform.infrastructure.ml

internal interface AndroidSocResolver {
  fun resolve(rawSocModel: String?): NpuTarget?
}

internal object KnownAndroidSocResolver : AndroidSocResolver {
  private val sm8850Aliases = setOf(
    "SM8850",
    "SM8850-AC",
    "SM8850-1-AD",
  )
  private val sm8750Aliases = setOf(
    "SM8750",
    "SM8750-AC",
  )

  override fun resolve(rawSocModel: String?): NpuTarget? {
    val normalized = rawSocModel?.trim()?.uppercase() ?: return null
    return when {
      normalized in sm8750Aliases -> NpuTarget.QUALCOMM_SM8750
      normalized in sm8850Aliases -> NpuTarget.QUALCOMM_SM8850
      else -> null
    }
  }
}

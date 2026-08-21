package com.gonezo.multiplatform.infrastructure.ml

interface DeviceMlCapabilities {
  val supportsNpu: Boolean
  val supportsGpu: Boolean
  val npuTarget: NpuTarget?
}

internal class AndroidDeviceMlCapabilities(
  private val socModelProvider: () -> String? = { android.os.Build.SOC_MODEL },
  override val supportsGpu: Boolean = true,
) : DeviceMlCapabilities {
  override val npuTarget: NpuTarget? = when (socModelProvider()?.trim()?.uppercase()) {
    SM8850 -> NpuTarget.QUALCOMM_SM8850
    else -> null
  }

  override val supportsNpu: Boolean
    get() = npuTarget != null

  companion object {
    private const val SM8850 = "SM8850"
  }
}

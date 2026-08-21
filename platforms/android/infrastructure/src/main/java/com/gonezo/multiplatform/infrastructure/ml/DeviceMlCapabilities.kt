package com.gonezo.multiplatform.infrastructure.ml

interface DeviceMlCapabilities {
  val supportsNpu: Boolean
  val supportsGpu: Boolean
  val npuTarget: NpuTarget?
}

internal class AndroidDeviceMlCapabilities(
  private val socModelProvider: () -> String? = { android.os.Build.SOC_MODEL },
  private val socResolver: AndroidSocResolver = KnownAndroidSocResolver,
  override val supportsGpu: Boolean = true,
) : DeviceMlCapabilities {
  internal val rawSocModel: String? = socModelProvider()

  override val npuTarget: NpuTarget? = socResolver.resolve(rawSocModel)

  override val supportsNpu: Boolean
    get() = npuTarget != null

}

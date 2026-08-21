# platforms/android/infrastructure

Android-specific infrastructure adapters and runtime composition classes.

These classes stay in the infrastructure layer but are Android deployment-specific.

## Experimental ML execution targets

The Android composition root resolves speech and structured-interpretation targets independently. Supported Qualcomm SM8750 and SM8850 plans use CPU speech through the existing whisper.cpp adapter and NPU interpretation through LiteRT-LM; other devices retain GPU interpretation.

Gonezo currently consumes `com.google.ai.edge.litertlm:litertlm-android:0.12.0`. That AAR contains the LiteRT runtime and GPU accelerator, but not the Qualcomm dispatch or QNN/HTP runtime libraries. The NPU path must therefore be provisioned only with a dispatch/QNN stack built for the exact `0.12.0` runtime ABI and `arm64-v8a`; libraries built from LiteRT `main` must not be substituted. The repository intentionally does not commit those vendor binaries or the gated model binary.

The SM8850 model descriptor is `Gemma3-1B-IT_q4_ekv1280_sm8850.litertlm` (693747712 bytes, SHA-256 `fda5dca0e8c1c6f65ca5625c326ff79920c7eb82625a0c6515ae4f5711957b1f`). Place that verified artifact in `app/android/third_party/` to include the optional NPU asset. The existing GPU model remains the default descriptor for other targets.

The SM8750 model descriptor is `Gemma3-1B-IT_q4_ekv1280_sm8750.litertlm` (689291264 bytes, SHA-256 `1904ceff9591e7a140df3a672c800e8e7bee8337526484b00f69ccef4fa2d60a`). It is downloaded from the `litert-community/Gemma3-1B-IT` Hugging Face repository and selected only for the SM8750 target.

`Sm8850NpuSmokeTest` is an instrumentation/manual test. Run it only on a real SM8850 device after the matching Qualcomm dispatch/QNN stack and verified model are provisioned; CI does not require an SM8850 device.

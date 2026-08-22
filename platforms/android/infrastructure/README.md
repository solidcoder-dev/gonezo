# platforms/android/infrastructure

Android-specific infrastructure adapters and runtime composition classes.

These classes stay in the infrastructure layer but are Android deployment-specific.

## Experimental ML execution targets

The Android composition root resolves speech and structured-interpretation targets independently. Supported Qualcomm SM8750 and SM8850 plans use CPU speech through the existing whisper.cpp adapter and NPU interpretation through LiteRT-LM; other devices retain GPU interpretation.

Gonezo currently consumes `com.google.ai.edge.litertlm:litertlm-android:0.12.0`. The AAR contains `libLiteRt.so`, `libLiteRtClGlAccelerator.so`, and `liblitertlm_jni.so` for `arm64-v8a` and `x86_64`, but not Qualcomm Dispatch or QNN/HTP runtime libraries. Its pinned source dependency is LiteRT commit `d865fd82cd7fe6752908b3a0836895461c305679`, whose Qualcomm workspace pins QAIRT `2.44.0.260225`. These versions form one compatibility bundle and must be upgraded together; a Dispatch library from LiteRT `main` is not interchangeable.

The matching Dispatch artifact must be built from that pinned LiteRT source with `//litert/vendors/qualcomm/dispatch:dispatch_api_so` and the pinned QAIRT SDK; it must not be copied from another LiteRT checkout. The QAIRT package is the Qualcomm AI Runtime Community archive `v2.44.0.260225.zip` under `2.44.0.260225`. The AAR’s bundled native ABI was verified from its archive: only `arm64-v8a` and `x86_64` are present, with no Dispatch or QNN libraries.

For an NPU-enabled APK, provision the arm64-only bundle under `app/android/third_party/qualcomm/jniLibs/arm64-v8a/` and add `app/android/third_party/qualcomm/bundle.properties` with the pinned `litertlm`, `litertSourceCommit`, `qairt`, `htp`, and `abi` values, then build with `-PgonezoQualcommNpuRuntimeEnabled=true`. The verified SM8750/HTP V79 runtime set is `libLiteRtDispatch_Qualcomm.so`, `libQnnSystem.so`, `libQnnHtp.so`, `libQnnHtpV79Stub.so`, and `libQnnHtpV79Skel.so`. The Gradle `verifyQualcommNpuRuntime` and `verifyQualcommNpuApk` tasks validate both source inputs and the final APK. Qualcomm SDK binaries are not committed; they must come from the pinned QAIRT package and be internally approved before provisioning.

The SM8850 model descriptor is `Gemma3-1B-IT_q4_ekv1280_sm8850.litertlm` (693747712 bytes, SHA-256 `fda5dca0e8c1c6f65ca5625c326ff79920c7eb82625a0c6515ae4f5711957b1f`). Place that verified artifact in `app/android/third_party/` to include the optional NPU asset. The existing GPU model remains the default descriptor for other targets.

The SM8750 model descriptor is `Gemma3-1B-IT_q4_ekv1280_sm8750.litertlm` (689291264 bytes, SHA-256 `1904ceff9591e7a140df3a672c800e8e7bee8337526484b00f69ccef4fa2d60a`). It is downloaded from the `litert-community/Gemma3-1B-IT` Hugging Face repository and selected only for the SM8750 target.

`Sm8750NpuSmokeTest` and `Sm8850NpuSmokeTest` are instrumentation/manual tests. Run the matching test only on a real supported Qualcomm device after its matching Qualcomm dispatch/QNN stack and verified model are provisioned; CI does not require a physical NPU device. The current native bundle contract is specifically SM8750/HTP V79; SM8850/HTP V81 requires a separately verified bundle and must not consume the V79 artifacts.

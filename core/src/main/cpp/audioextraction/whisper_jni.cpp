#include <jni.h>
#include <string>

#include "whisper.h"

namespace {
constexpr const char *kTag = "GonezoWhisperJNI";

const char *nullableJStringUtf(JNIEnv *env, jstring value) {
  if (value == nullptr) {
    return nullptr;
  }
  return env->GetStringUTFChars(value, nullptr);
}

void releaseNullableJStringUtf(JNIEnv *env, jstring value, const char *chars) {
  if (value == nullptr || chars == nullptr) {
    return;
  }
  env->ReleaseStringUTFChars(value, chars);
}

}  // namespace

extern "C" JNIEXPORT jlong JNICALL
Java_com_gonezo_audioextraction_infrastructure_transcription_whisper_WhisperNativeBridge_initContextNative(
    JNIEnv *env,
    jclass,
    jstring model_path) {
  const char *model_path_chars = nullableJStringUtf(env, model_path);
  if (model_path_chars == nullptr) {
    return 0;
  }

  whisper_context_params context_params = whisper_context_default_params();
  struct whisper_context *context = whisper_init_from_file_with_params(model_path_chars, context_params);

  releaseNullableJStringUtf(env, model_path, model_path_chars);
  return reinterpret_cast<jlong>(context);
}

extern "C" JNIEXPORT void JNICALL
Java_com_gonezo_audioextraction_infrastructure_transcription_whisper_WhisperNativeBridge_freeContextNative(
    JNIEnv *,
    jclass,
    jlong context_ptr) {
  if (context_ptr == 0) {
    return;
  }
  auto *context = reinterpret_cast<whisper_context *>(context_ptr);
  whisper_free(context);
}

extern "C" JNIEXPORT jint JNICALL
Java_com_gonezo_audioextraction_infrastructure_transcription_whisper_WhisperNativeBridge_fullTranscribeNative(
    JNIEnv *env,
    jclass,
    jlong context_ptr,
    jint num_threads,
    jstring language,
    jfloatArray audio_data) {
  if (context_ptr == 0 || audio_data == nullptr) {
    return -1;
  }

  auto *context = reinterpret_cast<whisper_context *>(context_ptr);
  const jsize audio_len = env->GetArrayLength(audio_data);
  if (audio_len <= 0) {
    return -2;
  }

  jfloat *audio = env->GetFloatArrayElements(audio_data, nullptr);
  if (audio == nullptr) {
    return -3;
  }

  const char *language_chars = nullableJStringUtf(env, language);

  whisper_full_params params = whisper_full_default_params(WHISPER_SAMPLING_GREEDY);
  params.print_realtime = false;
  params.print_progress = false;
  params.print_timestamps = false;
  params.print_special = false;
  params.translate = false;
  params.no_context = true;
  params.single_segment = false;
  params.n_threads = num_threads > 0 ? num_threads : 1;
  params.language = language_chars;

  whisper_reset_timings(context);
  const int result = whisper_full(context, params, audio, audio_len);

  releaseNullableJStringUtf(env, language, language_chars);
  env->ReleaseFloatArrayElements(audio_data, audio, JNI_ABORT);

  return result;
}

extern "C" JNIEXPORT jint JNICALL
Java_com_gonezo_audioextraction_infrastructure_transcription_whisper_WhisperNativeBridge_getTextSegmentCountNative(
    JNIEnv *,
    jclass,
    jlong context_ptr) {
  if (context_ptr == 0) {
    return 0;
  }
  auto *context = reinterpret_cast<whisper_context *>(context_ptr);
  return whisper_full_n_segments(context);
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_gonezo_audioextraction_infrastructure_transcription_whisper_WhisperNativeBridge_getTextSegmentNative(
    JNIEnv *env,
    jclass,
    jlong context_ptr,
    jint index) {
  if (context_ptr == 0) {
    return env->NewStringUTF("");
  }

  auto *context = reinterpret_cast<whisper_context *>(context_ptr);
  const char *text = whisper_full_get_segment_text(context, index);
  if (text == nullptr) {
    return env->NewStringUTF("");
  }
  return env->NewStringUTF(text);
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_gonezo_audioextraction_infrastructure_transcription_whisper_WhisperNativeBridge_getSystemInfoNative(
    JNIEnv *env,
    jclass) {
  const char *sysinfo = whisper_print_system_info();
  if (sysinfo == nullptr) {
    return env->NewStringUTF("");
  }
  return env->NewStringUTF(sysinfo);
}

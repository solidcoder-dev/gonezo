#include <jni.h>

#include <atomic>
#include <sstream>
#include <string>

#include "whisper.h"

struct NativeWhisperContext {
  whisper_context *context;
  std::atomic<bool> cancelled{false};
};

static bool shouldAbort(void *userData) {
  auto *context = static_cast<NativeWhisperContext *>(userData);
  return context->cancelled.load();
}

static std::string escapeJson(const char *value) {
  if (value == nullptr) {
    return "";
  }

  std::ostringstream escaped;
  for (const unsigned char character : std::string(value)) {
    switch (character) {
      case '\\': escaped << "\\\\"; break;
      case '"': escaped << "\\\""; break;
      case '\b': escaped << "\\b"; break;
      case '\f': escaped << "\\f"; break;
      case '\n': escaped << "\\n"; break;
      case '\r': escaped << "\\r"; break;
      case '\t': escaped << "\\t"; break;
      default:
        if (character < 0x20) {
          escaped << "\\u";
          escaped << std::hex;
          escaped.width(4);
          escaped.fill('0');
          escaped << static_cast<int>(character);
          escaped << std::dec;
        } else {
          escaped << static_cast<char>(character);
        }
    }
  }
  return escaped.str();
}

static std::string buildFailureJson(const std::string &code, const std::string &message, bool recoverable) {
  std::ostringstream json;
  json << "{\"error\":{"
       << "\"code\":\"" << escapeJson(code.c_str()) << "\","
       << "\"message\":\"" << escapeJson(message.c_str()) << "\","
       << "\"recoverable\":" << (recoverable ? "true" : "false") << ","
       << "\"retryable\":" << (recoverable ? "true" : "false")
       << "}}";
  return json.str();
}

static std::string buildSuccessJson(whisper_context *context) {
  const int segmentCount = whisper_full_n_segments(context);
  std::ostringstream textArray;
  std::ostringstream startArray;
  std::ostringstream endArray;
  std::ostringstream probabilityArray;
  std::ostringstream text;
  bool firstTextSegment = true;

  textArray << "[";
  startArray << "[";
  endArray << "[";
  probabilityArray << "[";

  for (int index = 0; index < segmentCount; ++index) {
    if (index > 0) {
      textArray << ",";
      startArray << ",";
      endArray << ",";
      probabilityArray << ",";
    }

    const char *segmentText = whisper_full_get_segment_text(context, index);
    const int64_t startMs = whisper_full_get_segment_t0(context, index) * 10;
    const int64_t endMs = whisper_full_get_segment_t1(context, index) * 10;
    const float noSpeechProbability = whisper_full_get_segment_no_speech_prob(context, index);

    textArray << "\"" << escapeJson(segmentText == nullptr ? "" : segmentText) << "\"";
    startArray << startMs;
    endArray << endMs;
    probabilityArray << noSpeechProbability;
    if (segmentText != nullptr) {
      const std::string segmentString = escapeJson(segmentText);
      if (!segmentString.empty()) {
        if (!firstTextSegment) {
          text << " ";
        }
        text << segmentString;
        firstTextSegment = false;
      }
    }
  }

  textArray << "]";
  startArray << "]";
  endArray << "]";
  probabilityArray << "]";

  std::ostringstream json;
  json << "{"
       << "\"text\":\"" << escapeJson(text.str().c_str()) << "\","
       << "\"segments\":{"
       << "\"text\":" << textArray.str() << ","
       << "\"startMs\":" << startArray.str() << ","
       << "\"endMs\":" << endArray.str() << ","
       << "\"noSpeechProbability\":" << probabilityArray.str()
       << "}"
       << "}";
  return json.str();
}

static jstring toJString(JNIEnv *env, const std::string &value) {
  return env->NewStringUTF(value.c_str());
}

extern "C" JNIEXPORT jlong JNICALL
Java_com_gonezo_multiplatform_plugins_speech_WhisperNativeBridge_initContext(JNIEnv *env, jclass, jstring modelPath) {
  if (modelPath == nullptr) return 0;
  const char *path = env->GetStringUTFChars(modelPath, nullptr);
  auto contextParams = whisper_context_default_params();
  auto *context = new NativeWhisperContext{
    whisper_init_from_file_with_params(path, contextParams),
  };
  env->ReleaseStringUTFChars(modelPath, path);
  if (context->context == nullptr) {
    delete context;
    return 0;
  }
  return reinterpret_cast<jlong>(context);
}

extern "C" JNIEXPORT void JNICALL
Java_com_gonezo_multiplatform_plugins_speech_WhisperNativeBridge_freeContext(JNIEnv *, jclass, jlong contextPtr) {
  if (contextPtr == 0) return;
  auto *context = reinterpret_cast<NativeWhisperContext *>(contextPtr);
  whisper_free(context->context);
  delete context;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_com_gonezo_multiplatform_plugins_speech_WhisperNativeBridge_isMultilingual(JNIEnv *, jclass, jlong contextPtr) {
  if (contextPtr == 0) return JNI_FALSE;
  auto *context = reinterpret_cast<NativeWhisperContext *>(contextPtr);
  return whisper_is_multilingual(context->context) != 0 ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jint JNICALL
Java_com_gonezo_multiplatform_plugins_speech_WhisperNativeBridge_languageId(JNIEnv *env, jclass, jstring language) {
  if (language == nullptr) return -1;
  const char *chars = env->GetStringUTFChars(language, nullptr);
  const int result = whisper_lang_id(chars);
  env->ReleaseStringUTFChars(language, chars);
  return result;
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_gonezo_multiplatform_plugins_speech_WhisperNativeBridge_transcribe(JNIEnv *env, jclass, jlong contextPtr, jint threads, jstring language, jboolean detectLanguageAutomatically, jfloatArray samples) {
  if (contextPtr == 0 || samples == nullptr) return toJString(env, buildFailureJson("invalid-audio", "Audio source is empty.", false));
  auto *nativeContext = reinterpret_cast<NativeWhisperContext *>(contextPtr);
  const jsize length = env->GetArrayLength(samples);
  if (length <= 0) return toJString(env, buildFailureJson("invalid-audio", "Audio source is empty.", false));
  jfloat *audio = env->GetFloatArrayElements(samples, nullptr);
  if (audio == nullptr) return toJString(env, buildFailureJson("invalid-audio", "Audio source could not be read.", false));
  const char *languageChars = language == nullptr ? nullptr : env->GetStringUTFChars(language, nullptr);
  const std::string whisperLanguage = detectLanguageAutomatically == JNI_TRUE ? "auto" : (languageChars == nullptr ? "" : languageChars);

  whisper_full_params params = whisper_full_default_params(WHISPER_SAMPLING_GREEDY);
  params.print_realtime = false;
  params.print_progress = false;
  params.print_timestamps = false;
  params.print_special = false;
  params.no_context = true;
  params.n_threads = threads > 0 ? threads : 1;
  params.language = whisperLanguage.c_str();
  params.detect_language = detectLanguageAutomatically == JNI_TRUE;
  params.abort_callback = shouldAbort;
  params.abort_callback_user_data = nativeContext;
  nativeContext->cancelled.store(false);

  const jint result = whisper_full(nativeContext->context, params, audio, length);
  if (languageChars != nullptr) env->ReleaseStringUTFChars(language, languageChars);
  env->ReleaseFloatArrayElements(samples, audio, JNI_ABORT);

  if (result != 0) {
    if (nativeContext->cancelled.load()) {
      return toJString(env, buildFailureJson("transcription-cancelled", "Speech transcription was cancelled.", true));
    }
    return toJString(env, buildFailureJson("native-transcription-failed", "Whisper native transcription failed.", true));
  }

  return toJString(env, buildSuccessJson(nativeContext->context));
}

extern "C" JNIEXPORT void JNICALL
Java_com_gonezo_multiplatform_plugins_speech_WhisperNativeBridge_cancel(JNIEnv *, jclass, jlong contextPtr) {
  if (contextPtr == 0) return;
  auto *context = reinterpret_cast<NativeWhisperContext *>(contextPtr);
  context->cancelled.store(true);
}

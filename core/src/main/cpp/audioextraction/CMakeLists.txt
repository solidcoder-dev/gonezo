cmake_minimum_required(VERSION 3.22.1)
project(gonezo_whisper_jni C CXX)

set(CMAKE_C_STANDARD 11)
set(CMAKE_CXX_STANDARD 17)

set(BUILD_SHARED_LIBS OFF CACHE BOOL "" FORCE)
set(WHISPER_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(WHISPER_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(WHISPER_BUILD_SERVER OFF CACHE BOOL "" FORCE)
set(WHISPER_CURL OFF CACHE BOOL "" FORCE)
set(WHISPER_SDL2 OFF CACHE BOOL "" FORCE)
set(WHISPER_OPENVINO OFF CACHE BOOL "" FORCE)
set(WHISPER_COREML OFF CACHE BOOL "" FORCE)
set(WHISPER_USE_SYSTEM_GGML OFF CACHE BOOL "" FORCE)
set(GGML_OPENMP OFF CACHE BOOL "" FORCE)
set(GGML_LLAMAFILE OFF CACHE BOOL "" FORCE)

add_subdirectory(third_party/whisper.cpp whisper_cpp_build)

add_library(gonezo_whisper_jni SHARED whisper_jni.cpp)

target_link_libraries(
  gonezo_whisper_jni
  PRIVATE
  whisper
  log
)

target_include_directories(
  gonezo_whisper_jni
  PRIVATE
  third_party/whisper.cpp/include
  third_party/whisper.cpp/ggml/include
)

cmake_minimum_required(VERSION 3.22.1)
project(gonezo_whisper_jni CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)
set(WHISPER_CPP_DIR "" CACHE PATH "Optional path to a separately provisioned whisper.cpp checkout")
set(WHISPER_CPP_ARCHIVE "${CMAKE_CURRENT_LIST_DIR}/../../../../../third_party/whisper.cpp-v1.7.6.tar.gz" CACHE FILEPATH "Pinned local whisper.cpp archive")
set(WHISPER_CPP_ARCHIVE_SHA256 "166140e9a6d8a36f787a2bd77f8f44dd64874f12dd8359ff7c1f4f9acb86202e")

if(WHISPER_CPP_DIR AND NOT EXISTS "${WHISPER_CPP_DIR}/CMakeLists.txt")
  set(WHISPER_CPP_DIR "" CACHE PATH "Optional path to a separately provisioned whisper.cpp checkout" FORCE)
endif()

set(BUILD_SHARED_LIBS OFF CACHE BOOL "" FORCE)
set(GGML_OPENMP OFF CACHE BOOL "" FORCE)
set(GGML_BACKEND_DL OFF CACHE BOOL "" FORCE)
set(WHISPER_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(WHISPER_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(WHISPER_BUILD_SERVER OFF CACHE BOOL "" FORCE)
set(WHISPER_CURL OFF CACHE BOOL "" FORCE)
set(WHISPER_SDL2 OFF CACHE BOOL "" FORCE)

if(NOT WHISPER_CPP_DIR)
  if(NOT EXISTS "${WHISPER_CPP_ARCHIVE}")
    message(FATAL_ERROR "Pinned whisper.cpp archive is missing: ${WHISPER_CPP_ARCHIVE}")
  endif()
  file(SHA256 "${WHISPER_CPP_ARCHIVE}" WHISPER_CPP_ARCHIVE_ACTUAL_SHA256)
  if(NOT WHISPER_CPP_ARCHIVE_ACTUAL_SHA256 STREQUAL WHISPER_CPP_ARCHIVE_SHA256)
    message(FATAL_ERROR "Pinned whisper.cpp archive failed SHA-256 validation")
  endif()
  set(WHISPER_CPP_EXTRACTION_DIR "${CMAKE_CURRENT_BINARY_DIR}/whisper.cpp-source")
  set(WHISPER_CPP_DIR "${WHISPER_CPP_EXTRACTION_DIR}/whisper.cpp-1.7.6")
  if(NOT EXISTS "${WHISPER_CPP_DIR}/CMakeLists.txt")
    file(ARCHIVE_EXTRACT INPUT "${WHISPER_CPP_ARCHIVE}" DESTINATION "${WHISPER_CPP_EXTRACTION_DIR}")
  endif()
endif()

if(NOT EXISTS "${WHISPER_CPP_DIR}/CMakeLists.txt")
  message(FATAL_ERROR "Pinned whisper.cpp v1.7.6 could not be provisioned from the local archive")
endif()

add_subdirectory("${WHISPER_CPP_DIR}" whisper_cpp_build)
add_library(gonezo_whisper_jni SHARED whisper_jni.cpp)
target_include_directories(gonezo_whisper_jni PRIVATE "${WHISPER_CPP_DIR}/include" "${WHISPER_CPP_DIR}/ggml/include")
target_link_libraries(gonezo_whisper_jni PRIVATE whisper log)

if(DEFINED CMAKE_ANDROID_NDK_VERSION AND CMAKE_ANDROID_NDK_VERSION VERSION_LESS 28)
  target_link_options(
    gonezo_whisper_jni
    PRIVATE
    "-Wl,-z,max-page-size=16384"
    "-Wl,-z,common-page-size=16384"
  )
endif()

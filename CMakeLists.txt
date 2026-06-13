cmake_minimum_required(VERSION 3.14)
project(GeminiGateway)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Configure FetchContent
include(FetchContent)

if (WIN32)
    add_compile_definitions(WIN32 _WIN32_WINNT=0x0601)
    set(HAVE_IOCTLSOCKET_FIONBIO 1 CACHE INTERNAL "Force ioctlsocket for MinGW")
    set(HAVE_IOCTLSOCKET 1 CACHE INTERNAL "Force ioctlsocket")
endif()

# We want static libraries for dependencies to avoid missing DLLs on Windows
set(BUILD_SHARED_LIBS OFF CACHE BOOL "" FORCE)

# Fetch CPR (C++ Requests)
FetchContent_Declare(
    cpr
    GIT_REPOSITORY https://github.com/libcpr/cpr.git
    GIT_TAG        1.10.5
)

# Fetch nlohmann/json
FetchContent_Declare(
    json
    GIT_REPOSITORY https://github.com/nlohmann/json.git
    GIT_TAG        v3.11.3
)

# Make dependencies available
FetchContent_MakeAvailable(cpr json)

# Create the executable
add_executable(gemini_gateway main.cpp)

# Output the executable to the project root so it always sits next to .env
set_target_properties(gemini_gateway PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY "${CMAKE_SOURCE_DIR}"
    RUNTIME_OUTPUT_DIRECTORY_DEBUG "${CMAKE_SOURCE_DIR}"
    RUNTIME_OUTPUT_DIRECTORY_RELEASE "${CMAKE_SOURCE_DIR}"
)

# Link the libraries
target_link_libraries(gemini_gateway PRIVATE cpr::cpr nlohmann_json::nlohmann_json)

# Post-build: print the output path so it is obvious where the binary landed
add_custom_command(TARGET gemini_gateway POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E echo
        ">>> Build complete: $<TARGET_FILE:gemini_gateway>"
)

#include <iostream>
#include <string>
#include <cstdlib>
#include <fstream>
#include <cpr/cpr.h>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

// Structure to hold our routing configuration
struct RequestConfig {
    std::string model;
    std::string system_prompt;
    std::string user_prompt;
};

// Function to intercept and route the prompt based on shortcuts
RequestConfig parse_prompt(const std::string& input) {
    RequestConfig config;
    const std::string council_prefix = "//council";
    
    if (input.substr(0, council_prefix.length()) == council_prefix) {
        // Council mode: use gemini-2.5-flash (free-tier compatible) with a rich multi-perspective system prompt
        config.model = "gemini-2.5-flash";
        config.system_prompt = "You are a council of three elite software engineers: a systems architect, a principal software engineer, and a security/performance specialist. "
                               "Debate the best approach to the user's problem. You must: "
                               "1. Analyze the request from each of your three unique perspectives. "
                               "2. List the pros, cons, trade-offs, and edge cases of alternative approaches. "
                               "3. Debate and resolve differences to reach a consensus. "
                               "4. Provide a single, production-ready, highly optimized consensus solution with clean code and explanations.";
        
        // Strip the prefix and any leading spaces
        std::string prompt = input.substr(council_prefix.length());
        size_t start = prompt.find_first_not_of(" \t");
        if (start != std::string::npos) {
            config.user_prompt = prompt.substr(start);
        } else {
            config.user_prompt = "";
        }
    } else {
        // Default behavior
        config.model = "gemini-2.5-flash"; 
        config.system_prompt = "You are an expert senior software engineer. Provide clean, documented, memory-safe code.";
        config.user_prompt = input;
    }
    return config;
}

// Helper function to load and parse .env file
void load_env_file(const std::string& filename) {
    std::ifstream file(filename);
    if (!file.is_open()) return;

    std::string line;
    while (std::getline(file, line)) {
        size_t start = line.find_first_not_of(" \t");
        if (start == std::string::npos || line[start] == '#') continue;

        size_t equal_pos = line.find('=', start);
        if (equal_pos == std::string::npos) continue;

        std::string key = line.substr(start, equal_pos - start);
        std::string value = line.substr(equal_pos + 1);

        size_t key_end = key.find_last_not_of(" \t");
        if (key_end != std::string::npos) key = key.substr(0, key_end + 1);

        size_t val_start = value.find_first_not_of(" \t\r\n\"");
        if (val_start != std::string::npos) {
            size_t val_end = value.find_last_not_of(" \t\r\n\"");
            value = value.substr(val_start, val_end - val_start + 1);
        } else {
            value = "";
        }

#ifdef _WIN32
        _putenv_s(key.c_str(), value.c_str());
#else
        setenv(key.c_str(), value.c_str(), 1);
#endif
    }
}

int main() {
    // 0. Load .env file from the current directory
    load_env_file(".env");

    // 1. Fetch API key securely from environment variables
    const char* api_key_env = std::getenv("GEMINI_API_KEY");
    if (!api_key_env) {
        std::cerr << "Error: GEMINI_API_KEY environment variable is not set.\n";
        std::cerr << "Please set it using: set GEMINI_API_KEY=your_key_here (Windows) or export GEMINI_API_KEY=your_key_here (Unix)\n";
        return 1;
    }
    std::string api_key = api_key_env;

    // 2. Target Google Gemini's OpenAI compatibility endpoint
    const std::string url = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

    std::cout << "=================================================\n";
    std::cout << "   Gemini CLI Gateway (OpenAI Compatibility)     \n";
    std::cout << "=================================================\n";
    std::cout << "Type your prompt. Prefix with //council for reasoning mode.\n";
    std::cout << "Type 'exit' or 'quit' to terminate.\n\n";

    std::string input;
    
    // 3. Clean interactive loop
    while (true) {
        std::cout << "> ";
        if (!std::getline(std::cin, input)) {
            break; // EOF or input error
        }

        // Trim trailing/leading whitespace (basic check)
        if (input == "exit" || input == "quit") {
            break;
        }

        if (input.empty()) {
            continue;
        }

        // Apply routing engine
        RequestConfig config = parse_prompt(input);

        // Build the OpenAI-compatible JSON payload
        json payload = {
            {"model", config.model},
            {"messages", json::array({
                {
                    {"role", "system"},
                    {"content", config.system_prompt}
                },
                {
                    {"role", "user"},
                    {"content", config.user_prompt}
                }
            })}
        };

        std::string payload_str = payload.dump();

        // 4. Execute the HTTPS POST request using standard Bearer authorization
        auto response = cpr::Post(cpr::Url{url},
                                  cpr::Header{
                                      {"Authorization", "Bearer " + api_key},
                                      {"Content-Type", "application/json"}
                                  },
                                  cpr::Body{payload_str});

        // 5. Handle and display the response
        if (response.status_code == 200) {
            try {
                json res_json = json::parse(response.text);
                if (res_json.contains("choices") && res_json["choices"].is_array() && !res_json["choices"].empty()) {
                    std::string reply = res_json["choices"][0]["message"]["content"];
                    std::cout << "\n[AI (" << config.model << ")]:\n" << reply << "\n\n";
                } else {
                    std::cout << "\n[AI Error]: Unexpected response format:\n" << response.text << "\n\n";
                }
            } catch (const json::parse_error& e) {
                std::cout << "\n[AI Error]: JSON Parse error: " << e.what() << "\n\n";
            }
        } else {
            // Parse and display API error messages cleanly
            std::string error_msg = "HTTP Error " + std::to_string(response.status_code);
            try {
                // Gemini API sometimes returns an array of errors
                auto err_text = response.text;
                if (!err_text.empty() && err_text[0] == '[') {
                    json err_arr = json::parse(err_text);
                    if (!err_arr.empty() && err_arr[0].contains("error")) {
                        error_msg += ": " + err_arr[0]["error"]["message"].get<std::string>();
                    }
                } else {
                    json err_json = json::parse(err_text);
                    if (err_json.contains("error") && err_json["error"].contains("message")) {
                        error_msg += ": " + err_json["error"]["message"].get<std::string>();
                    }
                }
            } catch (...) {
                error_msg += "\nRaw response: " + response.text.substr(0, 200);
            }
            std::cout << "\n[Error]: " << error_msg << "\n\n";
        }
    }

    return 0;
}

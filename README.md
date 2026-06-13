# Prompt-Router

A dual-layer AI prompt routing system — a C++ CLI gateway and a Chrome browser extension — that intercepts your prompts and routes them to optimized AI configurations based on prefix commands.

Type a normal prompt and get a clean, expert response. Prefix with `//council` and summon a panel of three senior engineers who debate, challenge each other, and converge on the best possible answer.

---

## How It Works

Prompt-Router has two components that work independently or together:

**1. C++ CLI Gateway (`main.cpp`)** — A terminal application that sends prompts to Google Gemini via its OpenAI-compatible API. It reads your input, checks for routing prefixes, applies the appropriate system prompt and model config, and streams back the response.

**2. Chrome Extension (`extension/`)** — A browser extension built with the same routing logic, letting you use Prompt-Router directly inside your browser without opening a terminal.

---

## Routing Modes

| Prefix | Mode | Behavior |
|---|---|---|
| *(none)* | Default | Expert senior software engineer. Clean, documented, memory-safe responses. |
| `//council` | Council | Three specialists debate your problem — a systems architect, a principal engineer, and a security/performance expert — then deliver a consensus solution. |

---

## Prerequisites

- **CMake** 3.14 or higher
- **A C++17-compatible compiler** (MSVC, GCC, or Clang)
- **Git** (for fetching dependencies via FetchContent)
- **A Google Gemini API key** (free tier works — get one at [aistudio.google.com](https://aistudio.google.com))
- **Node.js** (only if you want to build the extension via `build.js`)

---

## Setup — C++ CLI

### 1. Clone the repository

```bash
git clone https://github.com/youssef-880/Prompt-Router.git
cd Prompt-Router
```

### 2. Create your `.env` file

Create a file named `.env` in the project root (same folder as `main.cpp`):

```
GEMINI_API_KEY=your_api_key_here
```

> ⚠️ The `.env` file is gitignored and will never be committed. Keep your key safe.

### 3. Build

```bash
cmake -B build
cmake --build build --config Release
```

CMake will automatically fetch and compile `cpr` and `nlohmann/json` — no manual installs needed.

The compiled binary will be placed in the project root as `gemini_gateway` (or `gemini_gateway.exe` on Windows).

### 4. Run

```bash
./gemini_gateway
```

On Windows:

```bash
.\gemini_gateway.exe
```

---

## Usage — CLI

Once running, you'll see the prompt `>`. Type your message and hit Enter.

**Default mode:**
```
> explain the difference between a mutex and a semaphore
```

**Council mode:**
```
> //council what's the best way to structure a REST API for a real-time chat app
```

The council will analyze your question from three engineering perspectives, debate trade-offs, and deliver a single production-ready recommendation.

Type `exit` or `quit` to close the session.

---

## Setup — Chrome Extension

### 1. Build the extension

```bash
node build.js
```

This compiles the extension files and outputs the final `background.js` into the `extension/` folder.

### 2. Load into Chrome

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `extension/` folder from this repo

The extension is now active in your browser.

---

## Project Structure

```
Prompt-Router/
├── main.cpp              # C++ CLI gateway
├── CMakeLists.txt        # Build config — auto-fetches cpr and nlohmann/json
├── build.js              # Extension build script
├── extension/            # Chrome extension source
│   └── ...
├── agents.md             # Routing logic and agent design notes
├── .env                  # Your API key (gitignored, create this yourself)
└── .gitignore
```

---

## Dependencies

The C++ build fetches these automatically via CMake FetchContent — you don't need to install them manually:

- [cpr](https://github.com/libcpr/cpr) `1.10.5` — HTTP requests in C++
- [nlohmann/json](https://github.com/nlohmann/json) `v3.11.3` — JSON parsing

---

## Troubleshooting

**`GEMINI_API_KEY environment variable is not set`**
Make sure your `.env` file exists in the same directory as the binary and contains your key with no extra spaces.

**CMake can't find a compiler**
On Windows, install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) and run the build from a Developer Command Prompt.

**IntelliSense squiggles in VS Code**
These are false positives before CMake configures. Run `Ctrl+Shift+P` → `CMake: Configure` and they'll clear up.

**Extension not intercepting prompts**
Make sure you ran `node build.js` before loading the extension — the raw source needs to be built first.


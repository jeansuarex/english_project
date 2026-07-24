# Shakespeare MCP Server

Model Context Protocol server for the Shakespeare English learning platform.

## Tools

| Tool | Description |
|------|-------------|
| `get_user_profile` | Get user profile with stats |
| `get_vocabulary` | Get all learned vocabulary words |
| `get_vocabulary_by_topic` | Filter vocabulary by topic |
| `add_vocabulary_word` | Add a word to vocabulary |
| `quiz_vocabulary` | Get a vocabulary quiz |
| `get_progress_stats` | Detailed game progress statistics |
| `get_activity_heatmap` | Study activity heatmap data |
| `get_streak` | Current and longest streak |
| `get_badges` | All badges and progress |
| `get_recommendation` | Personalized study recommendations |
| `get_leaderboard` | Study activity ranking |
| `get_study_plan` | Weekly study plan |
| `get_game_history` | Recent game sessions |
| `get_recent_books` | Recently read books |

## Usage

### CLI Mode

```bash
bun run src/index.ts <command> <clerkId> [args]
```

Examples:
```bash
bun run src/index.ts profile user_123
bun run src/index.ts vocabulary user_123 100
bun run src/index.ts streak user_123
bun run src/index.ts recommend user_123
```

### MCP Client (Cursor, Claude Desktop, etc.)

Add to your MCP configuration:

**Cursor (cursor.json):**
```json
{
  "mcpServers": {
    "shakespeare": {
      "command": "bun",
      "args": ["run", "src/index.ts"]
      "cwd": "path/to/english_project/mcp"
    }
  }
}
```

**Claude Desktop (claude_desktop_config.json):**
```json
{
  "mcpServers": {
    "shakespeare": {
      "command": "bun",
      "args": ["run", "src/index.ts"],
      "cwd": "path/to/english_project/mcp"
    }
  }
}
```

**For production (stdio transport):**
```bash
cd mcp
bun install
bun run src/server.ts
```

## Example Prompts

- "Show me my vocabulary progress"
- "What should I study today?"
- "Give me a vocabulary quiz with 5 words"
- "Show my study streak and badges"
- "What's my weakest area in English?"
- "Compare my progress with other learners"

## Requirements

- Bun runtime
- Shakespeare API database at `../../api/data/shakespeare.db`

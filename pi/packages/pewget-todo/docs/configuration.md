# pewget-todo configuration

The extension reads its configuration without writing to it.

## Configuration paths

1. `$XDG_CONFIG_HOME/pewget-todo/config.json` if `XDG_CONFIG_HOME` is an absolute path. A leading `~` or `~/` is expanded first.
2. `~/.config/pewget-todo/config.json` if the variable is unset, empty, or relative, or the file at the first path does not exist.

If the XDG file exists but is invalid JSON, the extension warns and uses the defaults instead of reading another file. A missing file or a JSON value that is not an object also results in the defaults.

The extension does not read `rpiv-todo` settings automatically. To migrate, copy the old config into the `pewget-todo` config directory and keep the original if you want to roll back.

## Example

```json
{
  "maxWidgetLines": 8,
  "collapseKey": "ctrl+shift+t",
  "guidance": {
    "promptSnippet": "Track multi-step work with the todo tool.",
    "promptGuidelines": ["Mark a task in_progress before starting it."]
  }
}
```

## maxWidgetLines

Defaults to `12`, with a minimum of `3`. Invalid values fall back to the default. The limit includes the heading and overflow row but excludes the spacer. If the list exceeds the limit, completed tasks are hidden first, then rows from the end of the remaining list.

This setting is read on each render. Expanding tool output (`Ctrl+O` by default) temporarily shows all tasks in the expanded panel.

## collapseKey

Defaults to `"ctrl+shift+t"`. Leading and trailing whitespace is removed, and the value is lowercased. Use a Pi keybinding with any combination of `ctrl`, `shift`, `alt`, and `super`, without duplicates. Examples: `alt+t`, `ctrl+shift+t`, `super+alt+f5`. Empty or invalid values fall back to the default.

Set `"off"` to disable the keyboard shortcut without disabling clicks in fullscreen mode. Run `/reload` after changing this setting: the shortcut is registered when the extension loads.

## Guidance

`guidance.promptSnippet` and `guidance.promptGuidelines` replace the built-in instructions for the model. The snippet must be a nonempty string, and the guidelines must be a nonempty array of nonempty strings. Invalid values use the corresponding defaults. Run `/reload` after making changes.

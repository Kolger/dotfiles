# pewget-todo

A Pi extension that adds the `todo` tool, the `/todos` command, and a task list above the editor. This is an MIT-licensed fork of [@juicesharp/rpiv-todo 2.15.0](https://github.com/juicesharp/rpiv-mono/tree/main/packages/rpiv-todo). See [LICENSE](LICENSE) for the original copyright notice.

## Controls

- Left-click the heading or a task row to collapse the panel. Click the collapsed panel to expand it.
- Press `Ctrl+Shift+T` to toggle the panel from the keyboard.
- Run `/todos` to see the full list, grouped by status.

Mouse controls work in Pi's `fullscreen` mode. Use the keyboard shortcut in `regular` mode. Scrolling, dragging, modifier clicks, other mouse buttons, and clicks on the spacer below the list do not toggle it. The editor keeps focus.

## Installation

This extension is included in the [Pewget Pi package](../../README.md). Disable the original `@juicesharp/rpiv-todo` before enabling the fork: both register `todo` and `/todos`.

## Configuration

Use `$XDG_CONFIG_HOME/pewget-todo/config.json` or `~/.config/pewget-todo/config.json`:

```json
{
  "maxWidgetLines": 8,
  "collapseKey": "ctrl+shift+t"
}
```

To migrate, copy your existing `rpiv-todo/config.json` into the `pewget-todo` config directory. The extension only reads the file.

- `maxWidgetLines`: content row limit including the heading, but not the spacer. Defaults to `12`; the minimum is `3`. Changes take effect on the next render.
- `collapseKey`: keyboard shortcut. `"off"` disables the shortcut but leaves mouse controls available. Run `/reload` after changing it.
- `guidance`: instructions for the model when using the `todo` tool. Run `/reload` after changing them.

## Compatibility

The `todo` tool, `/todos` command, `rpiv-todos` widget key, and `rpiv-todo-state` session entry format are unchanged. Existing tasks are restored without migration. Tasks survive `/reload`, session resume, and compaction; the panel's collapsed state resets on reload. Built-in interface text is in English.

See the [tool reference](docs/tool-schema.md), [configuration](docs/configuration.md), and [widget behavior](docs/overlay.md).

# pewget-todo widget

The widget appears above the editor when there are tasks. It is hidden when the list is empty. Each session has its own task state.

## Collapsing the widget

In fullscreen mode, left-click the heading or a task row to collapse the panel. The collapsed panel shows the heading, an expand hint, and a spacer. Click the heading or the hint to expand it.

Only plain left clicks toggle the widget. Scrolling, dragging, clicks with `Shift`, `Alt`, or `Ctrl`, other mouse buttons, and clicks on the spacer have no effect. The editor keeps focus.

The default shortcut is `Ctrl+Shift+T` in both fullscreen and regular mode. Regular mode does not send mouse events to widgets and does not show the click hint. Setting `collapseKey` to `"off"` disables only the keyboard shortcut.

Collapsing the panel does not complete tasks or write to the session history. Tasks still update while the panel is collapsed. Reloading the extension expands it again.

## Rows and overflow

- The heading shows `Todos (completed/total)`.
- The status icons are `○` for pending, `◐` for in progress, and `✓` for completed.
- An in-progress task shows its `activeForm` if set. Tasks with dependencies show `⛓ #id`.
- Long lines are truncated to the terminal width.
- When the list exceeds `maxWidgetLines`, completed tasks are hidden first, then rows at the end of the remaining list. The last line shows `+N more` with the number of hidden tasks.
- Expanding tool output (`Ctrl+O` by default) shows all tasks when the panel is expanded.

Completed tasks remain visible until the next agent run begins. The `/todos` command shows the full list regardless of the row limit or whether the panel is collapsed.

See the [configuration reference](configuration.md) and [tool reference](tool-schema.md).

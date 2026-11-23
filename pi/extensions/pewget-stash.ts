/**
 * Press Ctrl+Shift+S to stash or restore the editor contents. If both the
 * editor and the stash contain text, swap them. The stash survives /new
 * and /resume, but is cleared when Pi exits.
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const STATUS_KEY = "pewget-stash";
const PREVIEW_LENGTH = 30;

// Keep the stash in process memory across /new and /resume.
const store = globalThis as typeof globalThis & { __piStash?: string };

function updateStatus(ctx: ExtensionContext) {
	const text = store.__piStash;
	if (!text) {
		ctx.ui.setStatus(STATUS_KEY, undefined);
		return;
	}

	const oneLine = text.replace(/\s+/g, " ").trim();
	const preview = oneLine.length > PREVIEW_LENGTH ? `${oneLine.slice(0, PREVIEW_LENGTH)}…` : oneLine;
	ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("accent", `pewget-stash: ${preview}`));
}

export default function (pi: ExtensionAPI) {
	pi.on("session_start", async (_event, ctx) => {
		updateStatus(ctx);
	});

	pi.registerShortcut("ctrl+shift+s", {
		description: "Stash or restore the editor text",
		handler: async (ctx) => {
			const editorText = ctx.ui.getEditorText();
			const stashed = store.__piStash;

			if (!stashed && !editorText.trim()) {
				ctx.ui.notify("Nothing to stash: the editor is empty", "info");
				return;
			}

			// When the editor is empty, restore the stash without saving a new draft.
			store.__piStash = editorText.trim() ? editorText : undefined;
			ctx.ui.setEditorText(stashed ?? "");
			updateStatus(ctx);
		},
	});
}

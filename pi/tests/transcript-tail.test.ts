import type { TUI } from "@earendil-works/pi-tui";
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { followTranscriptTail } from "../shared/transcript-tail.ts";

function makeRenderer() {
	const repaint: boolean[] = [];
	const renderer = {
		mode: "fullscreen",
		isFollowingOutput: true,
		contentChanged: false,
		repaintRequested: false,
		requestRender() { this.repaintRequested = true; },
		clampToEnd: false,
		onLayout: undefined as (() => void) | undefined,
		doRender() {
			repaint.push(this.contentChanged);
			this.contentChanged = false;
			if (this.clampToEnd) this.isFollowingOutput = true;
			this.onLayout?.();
		},
		getPrimaryScrollView() {
			return {
				scrollTop: 12,
				scrollTo: (row: number, options: { disableFollow: boolean }) => {
					assert.equal(row, 12);
					this.isFollowingOutput = !options.disableFollow;
				},
			};
		},
	};
	return { renderer, repaint };
}

test("only repaint widget content when entering or leaving scrollback", () => {
	const { renderer, repaint } = makeRenderer();
	const tail = followTranscriptTail(renderer as unknown as TUI);
	assert.equal(tail.visible(), true);
	renderer.isFollowingOutput = false;
	renderer.doRender();
	assert.equal(tail.visible(), false);
	renderer.doRender();
	renderer.isFollowingOutput = true;
	renderer.doRender();
	assert.equal(tail.visible(), true);
	assert.deepEqual(repaint, [true, false, true]);
	tail.dispose();
});

test("a small scroll stays detached when hiding the widgets expands the viewport", () => {
	const { renderer } = makeRenderer();
	const tail = followTranscriptTail(renderer as unknown as TUI);
	assert.equal(tail.visible(), true);
	renderer.isFollowingOutput = false;
	renderer.clampToEnd = true;
	renderer.onLayout = () => assert.equal(tail.visible(), false);
	renderer.doRender();
	assert.equal(tail.visible(), false);
	tail.dispose();
});

test("repaint the dock if a later resize resumes following", () => {
	const { renderer } = makeRenderer();
	const tail = followTranscriptTail(renderer as unknown as TUI);
	assert.equal(tail.visible(), true);
	renderer.isFollowingOutput = false;
	renderer.doRender();
	renderer.clampToEnd = true;
	renderer.doRender();
	assert.equal(renderer.repaintRequested, true);
	renderer.doRender();
	assert.equal(tail.visible(), true);
	tail.dispose();
});

test("widgets share a frame hook and release it on removal or a mode switch", () => {
	const { renderer } = makeRenderer();
	const original = renderer.doRender;
	let active: typeof renderer | { mode: "regular" } = renderer;
	const tui = {
		get mode() { return active.mode; },
		valueOf: () => active,
	} as unknown as TUI;
	const todo = followTranscriptTail(tui);
	const recap = followTranscriptTail(tui);
	assert.equal(todo.visible(), true);
	const shared = renderer.doRender;
	assert.notEqual(shared, original);
	assert.equal(recap.visible(), true);
	assert.equal(renderer.doRender, shared);
	todo.dispose();
	assert.equal(renderer.doRender, shared);
	active = { mode: "regular" };
	assert.equal(recap.visible(), true);
	assert.equal(renderer.doRender, original);
	active = renderer;
	assert.equal(recap.visible(), true);
	recap.dispose();
	assert.equal(renderer.doRender, original);
});

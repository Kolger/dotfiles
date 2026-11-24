import type { ScrollView, TUI } from "@earendil-works/pi-tui";

// Pi may load the two extension entrypoints in separate module caches.
const FRAME_HOOK = Symbol.for("pewget-pi.transcript-tail-frame");

type FullscreenRenderer = TUI & {
	isFollowingOutput: boolean;
	contentChanged: boolean;
	doRender(): void;
	getPrimaryScrollView(): ScrollView;
	[FRAME_HOOK]?: { users: number; following: boolean; remove(): void };
};

function fullscreenRenderer(tui: TUI): FullscreenRenderer | undefined {
	if (tui.mode !== "fullscreen") return;
	const renderer = tui.valueOf() as Partial<FullscreenRenderer>;
	if (
		typeof renderer.isFollowingOutput === "boolean" &&
		typeof renderer.contentChanged === "boolean" &&
		typeof renderer.doRender === "function" &&
		typeof renderer.getPrimaryScrollView === "function"
	) return renderer as FullscreenRenderer;
}

function watchFrames(renderer: FullscreenRenderer): () => void {
	let hook = renderer[FRAME_HOOK];
	if (!hook) {
		const descriptor = Object.getOwnPropertyDescriptor(renderer, "doRender");
		const original = renderer.doRender;
		const installed = {
			users: 0,
			following: renderer.isFollowingOutput,
			remove() {
				if (renderer.doRender === render) {
					if (descriptor) Object.defineProperty(renderer, "doRender", descriptor);
					else Reflect.deleteProperty(renderer, "doRender");
				}
				delete renderer[FRAME_HOOK];
			},
		};
		function render(this: FullscreenRenderer) {
			if (installed.users === 0) return original.call(this);
			const following = this.isFollowingOutput;
			const changed = following !== installed.following;
			// Keep the same visibility during measurement and drawing: layout
			// can change the viewport's follow state between the two.
			installed.following = following;
			// Pi normally reuses widget output in scroll-only frames.
			if (changed) this.contentChanged = true;
			original.call(this);
			if (!following && this.isFollowingOutput) {
				if (changed) {
					// Hiding the dock rows can make the larger viewport reach the end
					// after a small scroll. Stay detached until the user returns.
					const viewport = this.getPrimaryScrollView();
					viewport.scrollTo(viewport.scrollTop, { disableFollow: true });
				} else {
					// A later layout change (e.g. a resize) can resume following.
					this.requestRender();
				}
			}
		}
		renderer.doRender = render;
		hook = renderer[FRAME_HOOK] = installed;
	}
	const active = hook;
	active.users++;
	return () => {
		if (--active.users === 0) active.remove();
	};
}

export function followTranscriptTail(tui: TUI) {
	let renderer: FullscreenRenderer | undefined;
	let unwatch: (() => void) | undefined;
	return {
		visible(): boolean {
			// Resolve Pi's stable TUI proxy again after a fullscreen/regular switch.
			const current = fullscreenRenderer(tui);
			if (current !== renderer) {
				unwatch?.();
				renderer = current;
				unwatch = current && watchFrames(current);
			}
			return renderer?.[FRAME_HOOK]?.following !== false;
		},
		dispose() {
			unwatch?.();
			unwatch = undefined;
			renderer = undefined;
		},
	};
}

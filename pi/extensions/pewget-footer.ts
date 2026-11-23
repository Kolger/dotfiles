import { homedir } from "node:os";
import { basename, sep } from "node:path";
import type { ExtensionAPI, ExtensionContext, ReadonlyFooterDataProvider, Theme } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

function formatTokens(count: number): string {
	if (count < 1_000) return String(count);
	if (count < 10_000) return `${(count / 1_000).toFixed(1)}k`;
	if (count < 1_000_000) return `${Math.round(count / 1_000)}k`;
	if (count < 10_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
	return `${Math.round(count / 1_000_000)}M`;
}

function readStats(ctx: ExtensionContext) {
	let cost = 0;
	let hasCache = false;
	let cacheHit: number | undefined;

	// Usage covers the whole session, including summaries and abandoned branches.
	for (const entry of ctx.sessionManager.getEntries()) {
		const message = entry.type === "message" ? entry.message : undefined;
		const usage = message?.role === "assistant" || message?.role === "toolResult"
			? message.usage
			: entry.type === "usage" || entry.type === "compaction" || entry.type === "branch_summary"
				? entry.usage
				: undefined;
		if (!usage) continue;
		hasCache ||= usage.cacheRead > 0 || usage.cacheWrite > 0;
		cost += usage.cost.total;
		if (message?.role === "assistant") {
			const prompt = usage.input + usage.cacheRead + usage.cacheWrite;
			cacheHit = prompt > 0 ? (usage.cacheRead / prompt) * 100 : undefined;
		}
	}

	return { cost, cacheHit: hasCache ? cacheHit : undefined };
}

function readRoute(ctx: ExtensionContext): string {
	if (ctx.model?.api !== "pi-virtual") return "";
	const response = ctx.sessionManager.buildSessionProjection().entries
		.flatMap((entry) => entry.messages)
		.findLast((message) => message.role === "assistant" && message.stopReason !== "error" && message.stopReason !== "aborted");
	if (response?.role !== "assistant" || !ctx.modelRegistry.find(response.provider, response.model)) return "";
	return ` → ${response.model}${response.thinkingLevel ? ` • ${response.thinkingLevel}` : ""}`;
}

function usageSegments(ctx: ExtensionContext, stats: ReturnType<typeof readStats>, theme: Theme): string[] {
	const model = ctx.model;
	const sub = model && (model.provider === "kimi-coding" || (
		ctx.modelRegistry.isUsingOAuth(model) &&
		ctx.modelRegistry.getProvider(model.provider)?.auth.oauth?.isSubscription === true
	));
	const hit = stats.cacheHit === undefined ? "" : `CH${stats.cacheHit.toFixed(1)}%`;
	const cost = stats.cost || sub ? `$${stats.cost.toFixed(3)}${sub ? " sub" : ""}` : "";
	return [hit, cost].filter(Boolean).map((text) => theme.fg("muted", text));
}

function renderLine(
	ctx: ExtensionContext, theme: Theme, footerData: ReadonlyFooterDataProvider,
	context: ReturnType<typeof ctx.getContextUsage>, route: string, usage: string[], width: number,
): string {
	const dim = (text: string) => theme.fg("dim", text);
	const separator = "  ";
	const model = ctx.model;
	const modelText = theme.style(`◈ ${model?.id ?? "no-model"}`, { fg: "accent", bold: true });
	const provider = model && footerData.getAvailableProviderCount() > 1 ? dim(` (${model.provider})`) : "";
	const thinking = model?.reasoning ? theme.fg("syntaxKeyword", ctx.thinkingLevel ?? "off") : "";
	const cwd = ctx.sessionManager.getCwd();
	const home = homedir();
	const path = cwd === home || cwd.startsWith(`${home}${sep}`) ? `~${cwd.slice(home.length)}` : cwd;
	const name = ctx.sessionManager.getSessionName();
	const xp = process.env.PI_EXPERIMENTAL === "1" ? theme.fg("warning", "xp") : "";

	const percent = context ? context.percent : 0;
	const tone = (percent ?? 0) > 90 ? "error" : (percent ?? 0) > 70 ? "warning" : "success";
	const used = context?.tokens === null ? "?" : formatTokens(context?.tokens ?? 0);
	const limit = formatTokens(context?.contextWindow ?? model?.contextWindow ?? 0);
	const percentText = percent === null ? "?" : `${percent.toFixed(1)}%`;
	const detail = percent === null ? `${used}/${limit}` : `${used}/${limit} (${percentText})`;
	const contextText = theme.fg(tone, detail);
	let bar = "";
	if (percent !== null) {
		const filled = Math.max(0, Math.min(8, Math.floor(percent * 8 / 100)));
		bar = theme.fg(tone, "▰".repeat(filled)) + dim("▱".repeat(8 - filled)) + " ";
	}

	const selection = modelText + dim(route);
	const location = theme.fg("mdLink", path) + (name ? dim(` • ${name}`) : "");
	const details = [thinking, location, bar + contextText, ...usage, xp];
	const compactContext = theme.fg(tone, `${percentText}/${limit}`);
	const compact = [selection, thinking, theme.fg("mdLink", basename(path) || path), compactContext];
	for (const segments of [[selection + provider, ...details], [selection, ...details], [...compact, ...usage, xp], compact]) {
		const line = segments.filter(Boolean).join(separator);
		if (visibleWidth(line) <= width) return line;
	}

	// Keep the context readable even when there is no room for project metadata.
	const modelSpace = width - visibleWidth(compactContext) - visibleWidth(separator);
	return modelSpace >= 4
		? truncateToWidth(modelText, modelSpace, dim("…")) + separator + compactContext
		: truncateToWidth(compactContext, width, dim("…"));
}

export default function (pi: ExtensionAPI) {
	pi.on("session_start", (_event, ctx) => {
		if (ctx.mode !== "tui") return;
		ctx.ui.setFooter((_tui, theme, footerData) => {
			const session = ctx.sessionManager;
			let cached: {
				leaf: ReturnType<typeof session.getLeafId>;
				model: typeof ctx.model;
				stats: ReturnType<typeof readStats>;
				context: ReturnType<typeof ctx.getContextUsage>;
				route: string;
			} | undefined;
			return {
				invalidate() { cached = undefined; },
				render(width) {
					if (width <= 0) return [];
					const leaf = session.getLeafId();
					const model = ctx.model;
					if (!cached || cached.leaf !== leaf || cached.model !== model) {
						cached = { leaf, model, stats: readStats(ctx), context: ctx.getContextUsage(), route: readRoute(ctx) };
					}
					const { stats, context, route } = cached;
					const line = renderLine(ctx, theme, footerData, context, route, usageSegments(ctx, stats, theme), width);
					const separator = "  ";
					const available = width - visibleWidth(line) - visibleWidth(separator);
					if (available < 4) return [line];
					const statuses = [...footerData.getExtensionStatuses()]
						.sort(([a], [b]) => a.localeCompare(b))
						.map(([, text]) => text.replace(/[\r\n\t]/g, " ").replace(/ +/g, " ").trim())
						.filter(Boolean);
					return [statuses.length ? line + separator + truncateToWidth(statuses.join(" "), available, theme.fg("dim", "…")) : line];
				},
			};
		});
	});
}

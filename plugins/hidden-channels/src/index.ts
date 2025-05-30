import { findByProps, findByName } from "@vendetta/metro";
import { constants, React } from "@vendetta/metro/common";
import HiddenChannel from "./HiddenChannel";

import { after, instead } from "@vendetta/patcher";

import { showToast } from "@vendetta/ui/toasts";
import { showConfirmationAlert } from "@vendetta/ui/alerts";

const Permissions = findByProps("getChannelPermissions", "can");
const Router = findByProps("transitionToGuild");
const Fetcher = findByProps("stores", "fetchMessages");
const { ChannelTypes } = findByProps("ChannelTypes");
const { getChannel } = findByProps("getChannel") || findByName("getChannel", false);

const skipChannels = [ChannelTypes.DM, ChannelTypes.GROUP_DM, ChannelTypes.GUILD_CATEGORY];

function isHidden(channel: any | undefined) {
	if (channel == undefined) return false;
	if (typeof channel === "string") channel = getChannel(channel);
	if (!channel || skipChannels.includes(channel.type)) return false;
	channel.realCheck = true;
	let res = !Permissions.can(constants.Permissions.VIEW_CHANNEL, channel);
	delete channel.realCheck;
	return res;
}

console.log("Loaded Hidden Channels plugin");
console.log(constants.Permissions);

const unpatches: (() => void)[] = [];

export default {
	onLoad: () => {
		const ChannelMessages = findByProps("ChannelMessages") || findByName("ChannelMessages", false);
		if (!ChannelMessages) {
			console.error("Hidden Channels plugin: 'ChannelMessages' module not found.");
			return () => {};
		}

		unpatches.push(
			after("can", Permissions, ([permID, channel], res) => {
				// console.log("[HiddenChannels] Permissions.can called " + (!channel?.realCheck && permID === constants.Permissions.VIEW_CHANNEL));
				if (!channel?.realCheck && permID === constants.Permissions.VIEW_CHANNEL) return true;
				return res;
			})
		);

		unpatches.push(
			instead("transitionToGuild", Router, (args, orig) => {
				console.log("[HiddenChannels] Router.transitionToGuild called with args:", args);
				const [_, channel] = args;
				if (!isHidden(channel) && typeof orig === "function") orig(args);
			})
		);

		unpatches.push(
			instead("fetchMessages", Fetcher, (args, orig) => {
				console.log("[HiddenChannels] Fetcher.fetchMessages called with args:", args);
				const [channel] = args;
				if (!isHidden(channel) && typeof orig === "function") orig(args);
			})
		);

		unpatches.push(
			instead("default", ChannelMessages, (args, orig) => {
				console.log("[HiddenChannels] ChannelMessages.default called with args:", args);
				const channel = args[0]?.channel;
				console.log("[HiddenChannels] ChannelMessages.default called with:", channel, "isHidden:", isHidden(channel));
				if (!isHidden(channel) && typeof orig === "function") return orig(...args);
				else return React.createElement(HiddenChannel, { channel });
			})
		);

		const Components = [
			"ChannelScreen",
			"ChannelView",
			"transitionToGuild",
			"GuildChannel",
			"fetchMessages",
			"Channel",
			"Messages",
			"getChannel",
			"MessagesWrapper",
			"ChannelTypes",
			"ChannelMessages", // already tried
			"ChannelPage",
			"ChannelContainer",
			// ...add more as you find them
		];

		for (const name of Components) {
			const mod = findByProps(name);
			if (mod) {
				for (const key of Object.keys(mod)) {
					if (typeof mod[key] === "function") {
						instead(key, mod, (args, orig) => {
							if (typeof args[0] === "function") {
								console.log(`[HiddenChannels] ${name}.${key} called with function argument:`, args[0].name || "<anonymous>");
							} else {
								console.log(`[HiddenChannels] ${name}.${key} called`, args);
								let channel = getChannel(args[0]?.match(/(\d+)$/)[1]);
								console.log(channel);
								if (channel) {
									if (isHidden(channel)) {
										console.log(`[HiddenChannels] ${name}.${key} is hidden, returning HiddenChannel component.`);
										console.log(orig.toString());
										showConfirmationAlert({
											title: "This channel is hidden",
											content: `${channel.topic_ || "No Topic."}\n\nCreation date: ${new Date(channel.id).toLocaleString()}`,
											confirmText: "Close",
											onConfirm: () =>
												new Promise((res) => {
													setTimeout(res, 5000);
												})
										});
										return null;
									}
								}
							}
							console.log(`mod properties: ${Object.keys(mod).join(", ")} function ${mod[key].toString()}`);
							return orig(...args);
						});
					}
				}
			} else {
				console.log(`[HiddenChannels] Module ${name} not found.`);
			}
		}

		// const ChannelContainer = findByProps("ChannelContainer") || findByName("ChannelContainer", false);
		// if (ChannelContainer && typeof ChannelContainer.ChannelContainer === "function") {
		// 	console.log("[HiddenChannels] Patching ChannelContainer.ChannelContainer");

		// 	unpatches.push(
		// 		instead("ChannelContainer", ChannelContainer, (args, orig) => {
		// 			console.log("Hit");
		// 			return orig(...args);
		// 		})
		// 	);
		// }
		// const mod = findByName("ChannelMessages", false) || findByProps("ChannelMessages");
		// if (mod) {
		// 	for (const key of Object.keys(mod)) {
		// 		if (typeof mod[key] === "function") {
		// 			after(key, mod, (args) => {
		// 				console.log(`[HiddenChannels] ChannelMessages.${key} called`, args[0]);
		// 			});
		// 		}
		// 	}
		// }

		// const ChannelContainer = findByName("ChannelContainer", false) || findByProps("ChannelContainer");
		// if (ChannelContainer) {
		// 	console.log("[HiddenChannels] Patching ChannelContainer");

		// 	patches.push(
		// 		instead("ChannelContainer", ChannelContainer, (args, orig) => {
		// 			console.log("[HiddenChannels] ChannelContainer called with args:", args);
		//             const channel = args[0]?.channel;
		//             if (!isHidden(channel) && typeof orig === "function") return orig(...args);
		//             else return React.createElement(HiddenChannel, { channel });
		// 		})
		// 	);
		// }
	},
	onUnload: () => {
		for (const unpatch of unpatches) unpatch();
	},
};

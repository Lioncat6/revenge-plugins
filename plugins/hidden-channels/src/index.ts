import { findByProps, findByName } from "@vendetta/metro";
import { constants, React, ReactNative as RN } from "@vendetta/metro/common";
import HiddenChannel from "./HiddenChannel";
import AlertContent from "./AlertContent";
import { Settings } from "./settings";
import { getAssetByID, getAssetByName, getAssetIDByName } from "@vendetta/ui/assets";

import { after, instead } from "@vendetta/patcher";
import { showConfirmationAlert } from "@vendetta/ui/alerts";
import { settings } from "@vendetta";
import { storage } from "@vendetta/plugin";

const Permissions = findByProps("getChannelPermissions", "can");
// const Router = findByProps("transitionToGuild");
// const Fetcher = findByProps("stores", "fetchMessages");
const { ChannelTypes } = findByProps("ChannelTypes");
const { getChannel } = findByProps("getChannel") || findByName("getChannel", false);
const snowFlakeTimestamp = findByProps("extractTimestamp");

const skipChannels = [ChannelTypes.DM, ChannelTypes.GROUP_DM, ChannelTypes.GUILD_CATEGORY];



function isHidden(channel: any | undefined) {
	if (channel === undefined) return false;
	if (typeof channel === "string") channel = getChannel(channel);
	if (!channel || skipChannels.includes(channel.type)) return false;
	channel.realCheck = true;
	const res = !Permissions.can(constants.Permissions.VIEW_CHANNEL, channel);
	delete channel.realCheck;
	return res;
}

// console.log("Loaded Hidden Channels plugin");

const unpatches: (() => void)[] = [];

export default {
	onLoad: () => {
		storage.showIcon ??= true;

		const ChannelMessages = findByProps("ChannelMessages") || findByName("ChannelMessages", false);
		if (!ChannelMessages) {
			console.error("Hidden Channels plugin: 'ChannelMessages' module not found.");
			return () => { };
		}

		unpatches.push(
			after("can", Permissions, ([permID, channel], res) => {
				// console.log("[HiddenChannels] Permissions.can called " + (!channel?.realCheck && permID === constants.Permissions.VIEW_CHANNEL));
				if (!channel?.realCheck && permID === constants.Permissions.VIEW_CHANNEL) return true;
				return res;
			})
		);

		// unpatches.push(
		// 	instead("transitionToGuild", Router, (args, orig) => {
		// 		console.log("[HiddenChannels] Router.transitionToGuild called with args:", args);
		// 		const [_, channel] = args;
		// 		if (!isHidden(channel) && typeof orig === "function") orig(args);
		// 	})
		// );

		// unpatches.push(
		// 	instead("fetchMessages", Fetcher, (args, orig) => {
		// 		console.log("[HiddenChannels] Fetcher.fetchMessages called with args:", args);
		// 		const [channel] = args;
		// 		if (!isHidden(channel) && typeof orig === "function") orig(args);
		// 	})
		// );

		// unpatches.push(
		// 	instead("default", ChannelMessages, (args, orig) => {
		// 		console.log("[HiddenChannels] ChannelMessages.default called with args:", args);
		// 		const channel = args[0]?.channel;
		// 		console.log("[HiddenChannels] ChannelMessages.default called with:", channel, "isHidden:", isHidden(channel));
		// 		if (!isHidden(channel) && typeof orig === "function") return orig(...args);
		// 		else return React.createElement(HiddenChannel, { channel });
		// 	})
		// );

		// const Components = [
		// 	"transitionToGuild",
		// 	// "fetchMessages",
		// 	// "Channel",
		// 	// "Messages",
		// 	// "getChannel",
		// 	// "ChannelTypes",
		// 	// "ChannelMessages", // Not working for some reason
		// 	// "ChannelContainer",
		// ];

		const transitionToGuild = findByProps("transitionToGuild");
		if (transitionToGuild) {
			for (const key of Object.keys(transitionToGuild)) {
				// Yes, all of them need to be patched. No, I don't know why. The key that's actually responsible is 'forward'
				if (typeof transitionToGuild[key] === "function") {
					unpatches.push(
						instead(key, transitionToGuild, (args, orig) => {
							if (typeof args[0] === "string") {
								const pathMatch = args[0].match(/(\d+)$/);
								if (pathMatch?.[1]) {
									const channelId = pathMatch[1];
									const channel = getChannel(channelId);
									if (channel && isHidden(channel)) {
                                        // console.log(key.toString())
                                        showConfirmationAlert({
                                            title: "This channel is hidden.",
                                            content: React.createElement(AlertContent, { channel }),
                                            confirmText: "View Anyway",
                                            cancelText: "Cancel",
                                            onConfirm: () => { return orig(...args); },
                                        });
                                        return {};
									}
								}
							}
							return orig(...args);
						})
					);
				}
			}
		} else {
			console.warn("[HiddenChannels] transitionToGuild not found.");
		}

		const ChannelInfo = findByName("ChannelInfo", false);
		if (ChannelInfo && storage.showIcon) {
			unpatches.push(
				after("default", ChannelInfo, ([{ channel }], ret) =>
					React.createElement(
						React.Fragment,
						{},
						channel && isHidden(channel)
							? React.createElement(
								RN.Image,
								{
									source: getAssetByName("ic_lock").id,
									style: { width: 20, height: 20, marginRight: 4 },
								}
							)
							: null,
						ret,
					)
				)
			);
		}

	},
	onUnload: () => {
		for (const unpatch of unpatches) unpatch();
	},
	settings: Settings,
};

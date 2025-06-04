import { stylesheet, constants, moment, toasts, clipboard } from "@vendetta/metro/common";
import { findByProps } from "@vendetta/metro";
import { semanticColors } from '@vendetta/ui';
import { getAssetByName, getAssetIDByName } from "@vendetta/ui/assets";
import { showToast } from "@vendetta/ui/toasts";
import { React, ReactNative as RN } from "@vendetta/metro/common";
const {View, Text, Pressable } = findByProps("Button", "Text", "View");

const snowflakeUtils = findByProps("extractTimestamp");

const MessageStyles = stylesheet.createThemedStyleSheet({
	container: {
        'flex': 1,
        'padding': 16,
        'alignItems': 'center',
        'justifyContent': 'center',
    },
    title: {
        'fontFamily': constants.Fonts.PRIMARY_SEMIBOLD,
        'fontSize': 24,
        'textAlign': 'left',
        'color': semanticColors.HEADER_PRIMARY,
        'paddingVertical': 25
    },
    text: {
        'flex': 1,
        'flexDirection': 'row',
        'fontSize': 16,
        'textAlign': 'justify',
        'color': semanticColors.HEADER_PRIMARY,
    },
    dateContainer: {
        'height': 16,
        'alignSelf': 'baseline'
    },
	bold: {
		'fontFamily': constants.Fonts.PRIMARY_SEMIBOLD,
	},
    highlight: {
        'backgroundColor': semanticColors.BACKGROUND_MESSAGE_HIGHLIGHT_HOVER,
    }
    
});

function FancyDate({ date }) {
	return (
		<Text onPress={() => {
				showToast(
					moment(date).toLocaleString(), getAssetIDByName("ic_clock")
				);
			}}
			onLongPress={() => {
				clipboard.setString(date.getTime().toString());
				showToast(
					"Copied Timestamp to Clipboard", getAssetIDByName("ic_message_copy")
				);
			}} style={[MessageStyles.highlight]}>{moment(date).fromNow()}</Text>

	);
}

export default function AlertContent({ channel }) {
	return (
		<>
			<Text style={[MessageStyles.text, MessageStyles.bold]}>Topic:</Text> <Text>{channel.topic || "No topic."}</Text>
			<Text style={[MessageStyles.text, MessageStyles.bold]}>{"\n\n"}Creation date:</Text> <FancyDate date={new Date(snowflakeUtils.extractTimestamp(channel.id))} />
			<Text style={[MessageStyles.text, MessageStyles.bold]}>{"\n\n"}Last message:</Text> {channel.lastMessageId ? <FancyDate date={new Date(snowflakeUtils.extractTimestamp(channel.lastMessageId))} /> : <Text>No messages.</Text>}
			<Text style={[MessageStyles.text, MessageStyles.bold]}>{"\n\n"}Last pin:</Text> {channel.lastPinTimestamp ? <FancyDate date={new Date(channel.lastPinTimestamp)} /> : <Text>No pins.</Text>}
		</>
	);
}

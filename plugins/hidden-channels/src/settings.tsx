import { React, ReactNative as RN } from "@vendetta/metro/common";
import { useProxy } from "@vendetta/storage";
import { storage } from "@vendetta/plugin";
import { Forms } from "@vendetta/ui/components";
import { getAssetByID, getAssetIDByName } from "@vendetta/ui/assets";
import { settings } from "@vendetta";

const { FormRow, FormSection, FormSwitc, FormSwitchRow } = Forms;

export function Settings() {
	useProxy(storage);
	return (
		<RN.ScrollView style={{ flex: 1 }}>
			<FormSection title="Options" titleStyleType="no_border">
				<FormSwitchRow
					label={"Show Lock Icon"}
					subLabel={"Show a lock icon to the right of hidden channel names."}
					leading={<FormRow.Icon source={getAssetIDByName("ic_lock")} />}
					onValueChange={(value) => (storage.showIcon = value)}
					value={storage.showIcon}
				/>
				<FormSwitchRow
					label={"Show Popup on Hidden Channels"}
					subLabel={"Toggle the information popup that appears when selecting hidden channels."}
					leading={<FormRow.Icon source={getAssetIDByName("ic_more_android")} />}
					onValueChange={(value) => (storage.showPopup = value)}
					value={storage.showPopup}
				/>
			</FormSection>
		</RN.ScrollView>
	);
}

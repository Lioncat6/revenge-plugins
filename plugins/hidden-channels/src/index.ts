import patcher from "./patcher";

let unpatch: any;
export default {
    onLoad: () => (unpatch = patcher()),
    onUnload: () => unpatch?.(),
};
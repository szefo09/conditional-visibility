import { ConditionalVisibility } from "./ConditionalVisibility.js";
export const MODULE_NAME = "conditional-visibility";
export const DEFAULT_STEALTH = 10;
/**
 * Because typescript doesn't know when in the lifecycle of foundry your code runs, we have to assume that the
 * canvas is potentially not yet initialized, so it's typed as declare let canvas: Canvas | {ready: false}.
 * That's why you get errors when you try to access properties on canvas other than ready.
 * In order to get around that, you need to type guard canvas.
 * Also be aware that this will become even more important in 0.8.x because no canvas mode is being introduced there.
 * So you will need to deal with the fact that there might not be an initialized canvas at any point in time.
 * @returns
 */
export function getCanvas() {
    if (!(canvas instanceof Canvas) || !canvas.ready) {
        throw new Error("Canvas Is Not Initialized");
    }
    return canvas;
}
export const registerSettings = function () {
    game.settings.register(MODULE_NAME, "autoStealth", {
        name: game.i18n.localize("conditional-visibility.settings.autoStealth.name"),
        hint: game.i18n.localize("conditional-visibility.settings.autoStealth.hint"),
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
        onChange: value => console.log(MODULE_NAME + ' | autoStealth set to ' + value)
    });
    game.settings.register(MODULE_NAME, "popup-version", {
        scope: "world",
        config: false,
        type: String,
        default: "0.0.9",
    });
    // Register any custom module settings here
    ConditionalVisibility.onInit();
};

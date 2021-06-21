import { ConditionalVisibility } from "./ConditionalVisibility.js";
import { getCanvas, MODULE_NAME } from "./settings.js";
export let readyHooks = async () => {
    // setup all the hooks
    console.log(MODULE_NAME + ' | Ready ' + MODULE_NAME);
    const sightLayer = getCanvas().layers.find(layer => {
        //@ts-ignore
        return layer.__proto__.constructor.name === 'SightLayer';
    });
    ConditionalVisibility.initialize(sightLayer, getCanvas().hud.token);
    // Add any additional hooks if necessary
    Hooks.on("renderTokenConfig", (tokenConfig, html, data) => {
        ConditionalVisibility.INSTANCE.onRenderTokenConfig(tokenConfig, html, data);
    });
    Hooks.on("renderTokenHUD", (app, html, token) => {
        ConditionalVisibility.INSTANCE.onRenderTokenHUD(app, html, token);
    });
    //synthetic actors go through this
    // Hooks.on("preUpdateToken", ( token, update, options, userId) => {
    //     ConditionalVisibility.INSTANCE.onUpdateToken( token, update, options, userId);
    // });
    //real actors go through this
    Hooks.on("createActiveEffect", (effect) => {
        ConditionalVisibility.INSTANCE.onCreateActiveEffect(effect);
    });
    Hooks.on("deleteActiveEffect", (effect) => {
        ConditionalVisibility.INSTANCE.onDeleteActiveEffect(effect);
    });
};
export let initHooks = () => {
    console.warn("Init Hooks processing");
};

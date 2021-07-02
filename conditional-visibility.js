/**
 * This is your TypeScript entry file for Foundry VTT.
 * Register custom settings, sheets, and constants using the Foundry API.
 * Change this heading to be more descriptive to your module, or remove it.
 * Author: [your name]
 * Content License: [copyright and-or license] If using an existing system
 * 					you may want to put a (link to a) license or copyright
 * 					notice here (e.g. the OGL).
 * Software License: [your license] Put your desired license here, which
 * 					 determines how others may use and modify your module
 */
// Import TypeScript modules
import { MODULE_NAME, registerSettings } from './module/settings.js';
import { preloadTemplates } from './module/preloadTemplates.js';
import { readyHooks } from './module/Hooks.js';
import { ConditionalVisibility } from './module/ConditionalVisibility.js';
export let debugEnabled = 0;
// 0 = none, warnings = 1, debug = 2, all = 3
export let debug = (...args) => { if (debugEnabled > 1)
    console.log(`DEBUG:${MODULE_NAME} | `, ...args); };
export let log = (...args) => console.log(`${MODULE_NAME} | `, ...args);
export let warn = (...args) => { if (debugEnabled > 0)
    console.warn(`${MODULE_NAME} | `, ...args); };
export let error = (...args) => console.error(`${MODULE_NAME} | `, ...args);
export let timelog = (...args) => warn(`${MODULE_NAME} | `, Date.now(), ...args);
export let i18n = key => {
    return game.i18n.localize(key);
};
export let i18nFormat = (key, data = {}) => {
    return game.i18n.format(key, data);
};
export let setDebugLevel = (debugText) => {
    debugEnabled = { "none": 0, "warn": 1, "debug": 2, "all": 3 }[debugText] || 0;
    // 0 = none, warnings = 1, debug = 2, all = 3
    if (debugEnabled >= 3)
        CONFIG.debug.hooks = true;
};
export let socket;

/* ------------------------------------ */
/* Initialize module					*/
/* ------------------------------------ */
Hooks.once('init', async function () {
    if(game.modules.get("levels")?.active){
        return console.error("Conditional Visibility does not currently work with Levels module. Initialization stopped.");
    }
    console.log(MODULE_NAME + ' | init ' + MODULE_NAME);
    // Assign custom classes and constants here
    // Register custom module settings
    registerSettings();
    // Preload Handlebars templates
    await preloadTemplates();
    // Register custom sheets (if any)
});
/* ------------------------------------ */
/* Initialize Dependency		        */
/* ------------------------------------ */
Hooks.once("socketlib.ready", () => {
	socket = socketlib.registerModule(MODULE_NAME);
	socket.register("refresh", ConditionalVisibility.refresh);
});

Hooks.once('setup', function () {
});
/* ------------------------------------ */
/* When ready							*/
/* ------------------------------------ */
Hooks.once('ready', async function () {
    // Do anything once the module is ready
    readyHooks();
});

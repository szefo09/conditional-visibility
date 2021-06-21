import { MODULE_NAME } from "./settings.js";
export const preloadTemplates = async function () {
    const templatePaths = [
        // Add paths to "modules/senses/templates"
        "modules/" + MODULE_NAME + "/templates/extra_senses.html",
        "modules/" + MODULE_NAME + "/templates/stealth_hud.html",
        "modules/" + MODULE_NAME + "/templates/help_dialog.html"
    ];
    return loadTemplates(templatePaths);
};

import { i18n } from "../../conditional-visibility.js";
const MODULE_NAME = "conditional-visibility";
import { DefaultConditionalVisibilitySystem } from "./DefaultConditionalVisibilitySystem.js";
/**
 * Conditional visibility system for pf2e.  Uses only the built in pf2e invisibility.
 */
export class ConditionalVisibilitySystemPf2e extends DefaultConditionalVisibilitySystem {
    /**
     * Use the base conditions, plus set up the icon for the "hidden" condition
     */
    effects() {
        return ConditionalVisibilitySystemPf2e.PF2E_BASE_EFFECTS;
    }
    effectsFromUpdate(update) {
        return update.actorData?.items;
    }
    getEffectByIcon(effect) {
        //@ts-ignore
        return this.effectsByIcon().get(effect.img);
    }
    gameSystemId() {
        return "pf2e";
    }
    /**
     * Tests whether a token is invisible, and if it can be seen.
     * @param target the token being seen (or not)
     * @param visionCapabilities the sight capabilities of the sight layer
     */
    seeInvisible(target, visionCapabilities) {
        const invisible = this.hasStatus(target, 'invisible', 'invisible.png');
        if (invisible === true) {
            if (visionCapabilities.seeinvisible !== true) {
                return false;
            }
        }
        return true;
    }
}
ConditionalVisibilitySystemPf2e.PF2E_BASE_EFFECTS = new Array({
    id: MODULE_NAME + '.invisible',
    visibilityId: 'invisible',
    label: MODULE_NAME + '.invisible',
    icon: 'systems/pf2e/icons/conditions/invisible.png'
});

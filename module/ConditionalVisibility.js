import {
    ConditionalVisibilitySystem5e
} from "./systems/ConditionalVisibilitySystem5e.js";
import {
    ConditionalVisibilitySystemPf2e
} from "./systems/ConditionalVisibilitySystemPf2e.js";
import {
    DefaultConditionalVisibilitySystem
} from "./systems/DefaultConditionalVisibilitySystem.js";
import {
    ConditionalVisibilityFacadeImpl
} from "./ConditionalVisibilityFacade.js";
import {
    getCanvas,
    MODULE_NAME
} from "./settings.js";
import {
    socket
} from "../conditional-visibility.js";
export class ConditionalVisibility {
    /**
     * Create a ConditionalVisibility with a given sightLayer and tokenHud.
     * @param sightLayer the sightLayer to use
     * @param tokenHud the tokenHud to use
     */
    constructor(sightLayer, tokenHud) {
        this._conditionalVisibilitySystem = ConditionalVisibility.newSystem();
        console.log(MODULE_NAME + " | starting against v0.7 or greater instance " + game.data.version);
        this._getSrcTokens = () => {
            let srcTokens = new Array();
            if (this._sightLayer.sources) {
                for (const key of this._sightLayer.sources.keys()) {
                    if (key.startsWith("Token.")) {
                        const tok = getCanvas().tokens.placeables.find(tok => tok.id === key.substring("Token.".length));
                        if (tok) {
                            srcTokens.push(tok);
                        }
                    }
                }
            } else {
                if (game.user.isGM === false) {
                    srcTokens = game.user.character.getActiveTokens();
                }
            }
            return srcTokens;
        };
        this.actorUpdates = [];
        this.sceneUpdates = [];
        this.debouncedUpdate = debounce(async ()=> await this.applyChanges(),300);
        this._draw = async () => {
            await this._sightLayer.initialize();
            await this._sightLayer.refresh();
        };
        ConditionalVisibility.canSee = (token) => {
            return this._conditionalVisibilitySystem.canSee(token, this._capabilities);
        };
        this._sightLayer = sightLayer;
        const realRestrictVisibility = sightLayer.restrictVisibility;
        this._sightLayer.restrictVisibility = () => {
            this._capabilities = this._conditionalVisibilitySystem.getVisionCapabilities(this._getSrcTokens());
            realRestrictVisibility.call(this._sightLayer);
            const restricted = getCanvas().tokens.placeables.filter(token => token.visible);
            if (restricted && restricted.length > 0) {
                let srcTokens = this._getSrcTokens();
                if (srcTokens.length > 0) {
                    const flags = this._conditionalVisibilitySystem.getVisionCapabilities(srcTokens);
                    for (let t of restricted) {
                        if (srcTokens.indexOf(t) < 0) {
                            t.visible = this._conditionalVisibilitySystem.canSee(t, flags);
                        }
                    }
                }
            }
        };
        const realTestVisiblity = sightLayer.testVisibility;
        this._sightLayer.testVisibility = (point, options) => {
            return realTestVisiblity.call(this._sightLayer, point, options);
        };
        this._tokenHud = tokenHud;
        this._conditionalVisibilitySystem.initializeOnToggleEffect(this._tokenHud);
        game.socket.on("modifyEmbeddedDocument", async (message) => {
            const result = message.result.some(result => {
                return result?.flags?.[MODULE_NAME] || result?.actorData?.effects !== undefined;
            });
            if (result) {
                await this.draw();
            }
        });
        // update sight layer, as custom decisons will not be executed the
        // first time through, and cannot be forced in setup
        this.draw();
        // REMOVED
        /*
        const popupVersion = game.settings.get(MODULE_NAME, "popup-version");
        const currentVersion = game.modules.get(MODULE_NAME).data.version === "v0.2.0" ? "0.0.9" : game.modules.get(MODULE_NAME).data.version;

        if (this.isSemvarGreater(currentVersion, popupVersion)) {
        renderTemplate("modules/"+MODULE_NAME+"/templates/version_popup.html", {
            version: currentVersion,
        }).then(content => {
            let d = new Dialog({
                title: "Conditional Visibility",
                content: content,
                buttons: {
                    one: {
                        icon: '<i class="fas fa-check"></i>',
                        label: game.i18n.localize(MODULE_NAME+'.popup.dismissuntilupdated'),
                        callback: () => game.settings.set(MODULE_NAME, 'popup-version', currentVersion)
                       },
                       two: {
                        icon: '<i class="fas fa-times"></i>',
                        label: game.i18n.localize(MODULE_NAME+'.popup.close')
                       }
                },
                default: ""
               });
               d.render(true);
            });
        }
        */
    }
    /**
     * Called from init hook to establish the extra status effects in the main list before full game initialization.
     */
    static onInit() {
        const system = ConditionalVisibility.newSystem();
        const realIsVisible = Object.getOwnPropertyDescriptor(Token.prototype, 'isVisible').get;
        Object.defineProperty(Token.prototype, "isVisible", {
            get: function () {
                const isVisible = realIsVisible.call(this);
                if (isVisible === false) {
                    return false;
                }
                if (game.user.isGM || this.owner || !getCanvas().sight.tokenVision) {
                    return true;
                }
                return ConditionalVisibility.canSee(this);
            }
        });
        system.initializeStatusEffects();
    }
    isSemvarGreater(first, second) {
        const firstSemVar = this.splitOnDot(first);
        const secondSemVar = this.splitOnDot(second);
        if (firstSemVar.length != secondSemVar.length) {
            throw new Error("bad semvar first " + first + ", second" + second);
        }
        for (let i = 0; i < firstSemVar.length; i++) {
            if (firstSemVar[i] > secondSemVar[i]) {
                return true;
            }
        }
        return false;
    }
    splitOnDot(toSplit) {
        return toSplit.split(".").map(str => isNaN(Number(str)) ? 0 : Number(str));
    }
    /**
     * A static method that will be replaced after initialization with the appropriate system specific method.
     * @param token the token to test
     */
    static canSee(token) {
        return false;
    }
    /**
     * Create a new ConditionalVisibilitySystem appropriate to the game system
     * @returns ConditionalVisibilitySystem
     */
    static newSystem() {
        let system;
        switch (game.system.id) {
            case 'dnd5e':
                system = new ConditionalVisibilitySystem5e();
                break;
            case 'pf2e':
                system = new ConditionalVisibilitySystemPf2e();
                break;
            default:
                system = new DefaultConditionalVisibilitySystem();
        }
        return system;
    }
    /**
     * Initializes the ConditionalVisibilitySystem.  Called from ready Hook.
     * @param sightLayer the slightlayer from the game system.
     * @param tokenHud the tokenHud to use.
     */
    static initialize(sightLayer, tokenHud) {
        ConditionalVisibility.INSTANCE = new ConditionalVisibility(sightLayer, tokenHud);
        const facade = new ConditionalVisibilityFacadeImpl(ConditionalVisibility.INSTANCE, ConditionalVisibility.INSTANCE._conditionalVisibilitySystem);
        //@ts-ignore
        window.ConditionalVisibility = facade;
        ConditionalVisibility.INSTANCE._conditionalVisibilitySystem.initializeHooks(facade);
    }
    onRenderTokenConfig(tokenConfig, jQuery, data) {
        const visionTab = $('div.tab[data-tab="vision"]');
        renderTemplate("modules/" + MODULE_NAME + "/templates/extra_senses.html", tokenConfig.object.data.flags[MODULE_NAME] || {})
            .then(extraSenses => {
                visionTab.append(extraSenses);
            });
    }
    onRenderTokenHUD(app, html, token) {
        const systemEffects = this._conditionalVisibilitySystem.effectsByIcon();
        html.find("img.effect-control")
            .each((idx, icon) => {
                const src = icon.attributes.src.value;
                if (systemEffects.has(src)) {
                    let title;
                    if (systemEffects.get(src).visibilityId === 'hidden') {
                        //@ts-ignore
                        title = game.i18n.localize(systemEffects.get(src).label);
                        let tokenActorData;
                        if (!token.actorData?.flags) {
                            tokenActorData = game.actors.get(token.actorId).data;
                        } else {
                            tokenActorData = token.actorData;
                        }
                        if (tokenActorData && tokenActorData.flags && tokenActorData.flags[MODULE_NAME] &&
                            tokenActorData.flags[MODULE_NAME]._ste && !isNaN(parseInt(tokenActorData.flags[MODULE_NAME]._ste))) {
                            //@ts-ignore
                            title += ' ' + game.i18n.localize(MODULE_NAME + '.currentstealth') + ': ' + tokenActorData.flags[MODULE_NAME]._ste;
                        }
                    } else {
                        //@ts-ignore
                        title = game.i18n.localize(systemEffects.get(src).label);
                    }
                    icon.setAttribute("title", title);
                }
            });
    }
    onCreateActiveEffect(effect) {
        if (!game.user.isGM || !(effect.parent instanceof CONFIG.Actor.documentClass)) {
            return true;
        }
        const status = this._conditionalVisibilitySystem.getEffectByIcon(effect);
        if (status) {
            let flag = "flags.conditional-visibility."+status.visibilityId;
            if(effect.parent.isToken){
                ConditionalVisibility.INSTANCE.sceneUpdates.push({_id:effect.parent.parent.id,["actorData."+flag]:true})
            }else{
                ConditionalVisibility.INSTANCE.actorUpdates.push({_id:effect.parent.id,[flag]:true})
            }
            this.debouncedUpdate();
        }
    }

    onDeleteActiveEffect(effect) {
        if (!game.user.isGM || !(effect.parent instanceof CONFIG.Actor.documentClass)) {
            return true;
        }
        const status = this._conditionalVisibilitySystem.getEffectByIcon(effect);
        if (status) {
            let flag = "flags.conditional-visibility."+status.visibilityId;
            if(effect.parent.isToken){
                ConditionalVisibility.INSTANCE.sceneUpdates.push({_id:effect.parent.parent.id,["actorData."+flag]:false})
            }else{
                ConditionalVisibility.INSTANCE.actorUpdates.push({_id:effect.parent.id,[flag]:false})
            }
            this.debouncedUpdate();
        }
    }

    async applyChanges(){ 
        if (ConditionalVisibility.INSTANCE.sceneUpdates.length){
            await getCanvas().scene.updateEmbeddedDocuments("Token", ConditionalVisibility.INSTANCE.sceneUpdates);
            ConditionalVisibility.INSTANCE.sceneUpdates.length = 0;
        } 
        if (ConditionalVisibility.INSTANCE.actorUpdates.length){
            await Actor.updateDocuments(ConditionalVisibility.INSTANCE.actorUpdates);
            ConditionalVisibility.INSTANCE.actorUpdates.length = 0;
        }
        await socket.executeForEveryone("refresh");
    }

    // onUpdateToken( token, update, options, userId) {
    //     const effectsFromUpdate = this._conditionalVisibilitySystem.effectsFromUpdate(update);
    //     if (effectsFromUpdate) {
    //         let convis = {};
    //         this._conditionalVisibilitySystem.effectsByCondition().forEach((value, key) => {
    //             convis[key] = false;
    //         });
    //         //TODO- figure out active effects for this?
    //         effectsFromUpdate.forEach(effect => {
    //             const status = this._conditionalVisibilitySystem.getEffectByIcon(effect);
    //             if (status) {
    //                 //effect.changeType = "add";
    //                 //effect.changes = [{
    //                 //@ts-ignore
    //                 //    key: "data.data.convis." + status.id, value: true, mode: ACTIVE_EFFECT_MODES.OVERWRITE
    //                 //}]
    //                 convis[status.visibilityId] = true;
    //             }
    //         });
    //         if (!update.flags) {
    //             update.flags = {};
    //         }
    //         if (convis.hidden !== true) {
    //             convis._ste = null;
    //         }
    //         else {
    //             if (token.flags?.[MODULE_NAME]?._ste) {
    //                 convis._ste = token.flags[MODULE_NAME]._ste;
    //             }
    //         }
    //         if (update.flags[MODULE_NAME] === undefined) {
    //             update.flags[MODULE_NAME] = convis;
    //         }
    //         this.draw().then(() => { });
    //     }
    //     else if (update.flags && update.flags[MODULE_NAME]) {
    //         this.draw().then(() => { });
    //     }
    // }
    async draw() {
        this._draw();
    }
    static refresh() {
        ConditionalVisibility.INSTANCE._sightLayer.refresh();
    }

}
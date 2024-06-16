// LG extensions are at alpha stage, should be loaded and registered similar as ComfyUI does
// Usually they need graphcanvas reference, atm it needs to be exposed as global on window

import { LiteGraph } from "./litegraph.js";

window.LiteGraph = LiteGraph;

export class litegraph_extensions{
    // load LG extensions
    static dynamicallyLoadScript(url) {
        return new Promise((resolve, reject) => {
            var script = document.createElement("script");
            script.src = url;
            script.onload = () => resolve(url);
            script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
            document.head.appendChild(script);
        });
    }
    static async loadScriptsSequentially(urls) {
        for (const url of urls) {
            try {
                await this.dynamicallyLoadScript(url);
                console.log(`Successfully loaded script: ${url}`);
            } catch (error) {
                console.error(error);
            }
        }
    }
    static load(){
        this.loadScriptsSequentially([
            './lib/extensions/autoconnect.js'
            ,'./lib/extensions/keyboard_helper.js'
            ,'./lib/extensions/renamer.js'
            // ,'./lib/extensions/canvas_background.js' // MOVED to core
            // ,'./lib/extensions/options_panel.js' // WIP
        ]);
    };
}
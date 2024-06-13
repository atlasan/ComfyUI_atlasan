// litegraph.core.js


const script = document.createElement('script');
script.type = 'module';
script.textContent = `
    import { LiteGraph } from './lib/forward/litegraph.js';
    import { LGraph } from './lib/forward/lgraph.js';
    import { LLink } from './lib/forward/llink.js';
    import { LGraphNode } from './lib/forward/lgraphnode.js';
    import { LGraphGroup } from './lib/forward/lgraphgroup.js';
    import { DragAndScale } from './lib/forward/dragandscale.js';
    import { LGraphCanvas } from './lib/forward/lgraphcanvas.js';
    import { ContextMenu } from './lib/forward/contextmenu.js';

    // Attach components to the global window object for global access
    window.LiteGraph = LiteGraph;
    window.LGraph = LGraph;
    window.LLink = LLink;
    window.LGraphNode = LGraphNode;
    window.LGraphGroup = LGraphGroup;
    window.DragAndScale = DragAndScale;
    window.LGraphCanvas = LGraphCanvas;
    window.ContextMenu = ContextMenu;

    // Function to load extensions script
    function loadExtensions() {
        return import('./lib/litegraph.extensions.js');
    }
    // Load extensions script after attaching components to window object
    loadExtensions().then(() => {
        console.log('Extensions loaded successfully');
    }).catch(err => {
        console.error('Failed to load extensions:', err);
    });

    // Function to set config defaults
    function loadDefaults() {
        return import('./lib/forward/defaults_debug.js');
    }
    // set config defaults
    loadDefaults().then(() => {
        console.log('Configs set successfully');
    }).catch(err => {
        console.error('Failed to set config:', err);
    });
    
    // Export as ES6 module
    export { LiteGraph, LGraph, LLink, LGraphNode, LGraphGroup, DragAndScale, LGraphCanvas, ContextMenu };

`;
document.head.appendChild(script);
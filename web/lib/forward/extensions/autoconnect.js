/**
 * EXAMPLE EXTENSION TO AUTOCONNECT SELECTED NODES TO ANOTHER (SINGLE) NODE
 * press a than click on a node
 */

// import { LiteGraph } from "../litegraph.js";

if(LiteGraph && graphcanvas) (function(){
    // enable only if debugging CallbackHandler itself
    // graphcanvas.cb_handler.debug = true;

    // oCbInfo is first passed parameter and contains infos about the event execution chain 

    let ext = "autoconnect";
    let debug = false;

    // onKeyDown
    const cbP = graphcanvas.registerCallbackHandler("onKeyDown",function(oCbInfo, keyEvent){
        if(debug) console.info(ext, "*** onKeyDown handler ***", ...arguments);
        switch(keyEvent.keyCode){
            case 65: // a
                // check selected nodes
                let nSel = Object.keys(graphcanvas.selected_nodes).length;
                var aNodesFrom = [];
                if(nSel){
                    for(let iO in graphcanvas.selected_nodes){
                        // graphcanvas.graph.autoConnectNodes(node_from, node_to);
                        aNodesFrom.push(graphcanvas.selected_nodes[iO]);
                    }
                }
                
                graphcanvas.registerCallbackHandler("onMouseDown",function(md_oCbInfo, e){
                    if(debug) console.info(ext, "*** onMouseDown handler ***", ...arguments);

                    let node_to = graphcanvas.graph.getNodeOnPos( e.canvasX, e.canvasY, graphcanvas.visible_nodes, 5 );

                    if(node_to){
                        if(debug) console.info(ext, "### dbg: clicked on DEST node, autoconnect", node_to, aNodesFrom);
                        for(let node_from of aNodesFrom){
                            if(debug) console.info(ext, "### dbg: AUTOCONNECT", node_from, node_to);
                            graphcanvas.graph.autoConnectNodes(node_from, node_to);
                        }
                    }else{
                        if(debug) console.info(ext, "### dbg: not clicked on a node", node_to);
                    }

                },{ call_once: true }); // register to call only once

            break;
            default:
                if(debug) console.debug(ext, "### dbg: ignore key", keyEvent.keyCode);
            break;
        }
    });

    console.info("LGext","autoconnect","onKeyDown CBH registered",cbP);

})(); else console.warn("no LiteGraph or graphcanvas");
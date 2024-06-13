import { LiteGraph } from "./litegraph.js";
import { CallbackHandler } from "./callbackhandler.js";

/*
title: string
pos: [x,y]
size: [x,y]

input|output: every connection
    +  { name:string, type:string, pos: [x,y]=Optional, direction: "input"|"output", links: Array });

general properties:
    + clip_area: if you render outside the node, it will be clipped
    + unsafe_execution: not allowed for safe execution
    + skip_repeated_outputs: when adding new outputs, it wont show if there is one already connected
    + resizable: if set to false it wont be resizable with the mouse
    + horizontal: slots are distributed horizontally
    + widgets_start_y: widgets start at y distance from the top of the node

flags object:
    + collapsed: if it is collapsed

supported callbacks:
    + onAdded: when added to graph (warning: this is called BEFORE the node is configured when loading)
    + onRemoved: when removed from graph
    + onStart:	when the graph starts playing
    + onStop:	when the graph stops playing
    + onDrawForeground: render the inside widgets inside the node
    + onDrawBackground: render the background area inside the node (only in edit mode)
    + onMouseDown
    + onMouseMove
    + onMouseUp
    + onMouseEnter
    + onMouseLeave
    + onExecute: execute the node
    + onPropertyChanged: when a property is changed in the panel (return true to skip default behaviour)
    + onGetInputs: returns an array of possible inputs
    + onGetOutputs: returns an array of possible outputs
    + onBounding: in case this node has a bigger bounding than the node itself (the callback receives the bounding as [x,y,w,h])
    + onDblClick: double clicked in the node
    + onInputDblClick: input slot double clicked (can be used to automatically create a node connected)
    + onOutputDblClick: output slot double clicked (can be used to automatically create a node connected)
    + onConfigure: called after the node has been configured
    + onSerialize: to add extra info when serializing (the callback receives the object that should be filled with the data)
    + onSelected
    + onDeselected
    + onDropItem : DOM item dropped over the node
    + onDropFile : file dropped over the node
    + onConnectInput : if returns false the incoming connection will be canceled
    + onConnectionsChange : a connection changed (new one or removed) (LiteGraph.INPUT or LiteGraph.OUTPUT, slot, true if connected, link_info, input_info )
    + onAction: action slot triggered
    + getExtraMenuOptions: to add option to context menu
*/

/**
 * Base Class for all the node type classes
 * @class LGraphNode
 * @param {String} name a name for the node
 */

export class LGraphNode {

    cb_handler = false;

    // TODO check when is this called: a default node from the ones included will have his constructor
    // should every node extend this istead of 
    constructor(title = "") {
        // a custom registered node will have his custom constructor
        LiteGraph.log_verbose("lgraphNODE", "ORIGINAL constructor",this,title);

        this.title = title;
        this.size = [LiteGraph.NODE_WIDTH, 60];
        this.graph = null;

        this._pos = new Float32Array(10, 10);

        if (LiteGraph.use_uuids) {
            this.id = LiteGraph.uuidv4();
        } else {
            this.id = -1; // not know till not added
        }
        this.type = null;

        // inputs available: array of inputs
        this.inputs = [];
        this.outputs = [];
        this.connections = [];

        // local data
        this.properties = {}; // for the values
        this.properties_info = []; // for the info

        this.flags = {};

        this.post_constructor(...arguments);
    }

    post_constructor(){
        // DBG EXCESS LiteGraph.log_verbose("lgraphNODE", "postconstruct",this,...arguments);
        // register CallbackHandler methods on this
        this.callbackhandler_setup();
    }

    callbackhandler_setup(){
        this.cb_handler = new CallbackHandler(this);
        // register CallbackHandler methods on this // Should move as class standard class methods?
        // this.registerCallbackHandler = function(){ return this.cb_handler.registerCallbackHandler(...arguments); };
        // this.unregisterCallbackHandler = function(){ return this.cb_handler.unregisterCallbackHandler(...arguments); };
        // this.processCallbackHandlers = function(){ return this.cb_handler.processCallbackHandlers(...arguments); };
    }

    registerCallbackHandler(){
        if(!this.cb_handler) this.callbackhandler_setup(); // needed if constructor calls callback events
        return this.cb_handler.registerCallbackHandler(...arguments);
    };
    unregisterCallbackHandler(){
        if(!this.cb_handler) this.callbackhandler_setup(); // needed if constructor calls callback events
        return this.cb_handler.unregisterCallbackHandler(...arguments);
    };
    processCallbackHandlers(){
        if(!this.cb_handler) this.callbackhandler_setup(); // needed if constructor calls callback events
        return this.cb_handler.processCallbackHandlers(...arguments);
    };

    set pos(v) {
        if (!v || v.length < 2) {
            return;
        }
        this._pos ??= new Float32Array(10, 10);
        this._pos[0] = v[0];
        this._pos[1] = v[1];
    }
    get pos() {
        return this._pos;
    }

    /**
     * configure a node from an object containing the serialized info
     * @method configure
     */
    configure(info) {
        
        LiteGraph.log_debug("lgraphnode", "configure",this,info);

       if(this.graph)
           this.graph.onGraphChanged({action: "nodeBeforeConfigure", doSave: false});

        Object.entries(info).forEach(([key, value]) => {
            if (key === "properties") {
                for (var k in value) {
                    this.properties[k] = value[k];
                    this.processCallbackHandlers("onPropertyChanged",{
                        def_cb: this.onPropertyChanged
                    }, k, value[k]);
                }
                return;
            }

            if (value === null) {
                return;
            } else if (typeof value === "object") {
                if (this[key] && typeof(this[key].configure)=="function") {
                    this[key].configure(value);
                    LiteGraph.log_verbose("lgraphnode","configure","use var internal configure method",key,value);
                } else {
                    LiteGraph.log_verbose("lgraphnode","configure","set ob var key",key,value,this[key]);
                    this[key] = LiteGraph.cloneObject(value, this[key]);
                }
            } else {
                LiteGraph.log_verbose("lgraphnode","configure","set node var",key,value);
                this[key] = value;
            }
        });

        if (!info.title) {
            this.title = this.constructor.title;
        }

        this.inputs?.forEach((input, i) => {
            if(!input.link)
                return;
            const link_info = this.graph ? this.graph.links[input.link] : null;
            this.processCallbackHandlers("onConnectionsChange",{
                def_cb: this.onConnectionsChange
            }, LiteGraph.INPUT, i, true, link_info, input);
            this.processCallbackHandlers("onInputAdded",{
                def_cb: this.onInputAdded
            }, input);
        });

        this.outputs?.forEach((output, i) => {
            if (!output.links)
                return;
            output.links.forEach((link, i) => {
                const link_info = this.graph?.links[link] || null; // fixed
                LiteGraph.log_verbose("lgraphnode", "configure","cycle outputlinks",link,i,link_info);
                this.processCallbackHandlers("onConnectionsChange",{
                    def_cb: this.onConnectionsChange
                }, LiteGraph.OUTPUT, i, true, link_info, output);
            });
            this.processCallbackHandlers("onOutputAdded",{
                def_cb: this.onOutputAdded
            }, output);
        });

        if (this.widgets) {
            this.widgets.forEach((w) => {
                if (!w) {
                    return;
                }
                if (w.options && w.options.property && this.properties[w.options.property] !== undefined) {
                    w.value = JSON.parse(JSON.stringify(this.properties[w.options.property]));
                }
            });

            info.widgets_values?.forEach((value, i) => {
                if (this.widgets[i]) {
                    this.widgets[i].value = value;
                }
            });
        }
        this.processCallbackHandlers("onConfigure",{
            def_cb: this.onConfigure
        }, info);
        this.graph?.onGraphChanged({action: "nodeConfigure", doSave: false});
        LiteGraph.log_debug("lgraphnode", "configure complete",this);
    }

    /**
     * serialize the content
     * @method serialize
     */

    serialize() {
        // create serialization object
        var o = {
            id: this.id,
            type: this.type,
            pos: this.pos,
            size: this.size,
            flags: LiteGraph.cloneObject(this.flags),
            order: this.order,
            mode: this.mode,
        };

        // special case for when there were errors
        if (this.constructor === LGraphNode && this.last_serialization) {
            return this.last_serialization;
        }

        if (this.inputs) {
            o.inputs = LiteGraph.cloneObject(this.inputs);
        }

        if (this.outputs) {
            // clear outputs last data (because data in connections is never serialized but stored inside the outputs info)
            this.outputs.forEach((output) => {
                delete output._data;
            });
            o.outputs = LiteGraph.cloneObject(this.outputs);
        }

        if (this.title && this.title != this.constructor.title) {
            o.title = this.title;
        }

        if (this.properties) {
            o.properties = LiteGraph.cloneObject(this.properties);
        }

        if (this.widgets && this.serialize_widgets) {
            o.widgets_values = this.widgets.map((widget) => widget?.value ?? null);
        }

        o.type ??= this.constructor.type;

        if (this.color) {
            o.color = this.color;
        }
        if (this.bgcolor) {
            o.bgcolor = this.bgcolor;
        }
        if (this.boxcolor) {
            o.boxcolor = this.boxcolor;
        }
        if (this.shape) {
            o.shape = this.shape;
        }

        let r = this.processCallbackHandlers("onSerialize",{
            def_cb: this.onSerialize
        }, o);
        // DBG EXCESS LiteGraph.log_verbose("lgraphnode", "serialize", "onSerialize", o, r);

        if(r!==null && (typeof(r)=="object" && r.return_value!==null)){
            LiteGraph.log_warn("lgraphnode", "onSerialize shouldnt return anything, data should be stored in the object pass in the first parameter");
        }
        return o;
    }

    /* Creates a clone of this node */
    clone() {
        var node = LiteGraph.createNode(this.type);
        if (!node) {
            return null;
        }

        // we clone it because serialize returns shared containers
        var data = LiteGraph.cloneObject(this.serialize());

        // remove links
        data.inputs?.forEach((input) => {
            input.link = null;
        });

        data.outputs?.forEach((output) => {
            if(output.links)
                output.links.length = 0;
        });

        delete data["id"];

        if (LiteGraph.use_uuids) {
            data["id"] = LiteGraph.uuidv4()
        }

        // remove links
        node.configure(data);
        return node;
    }

    /**
     * serialize and stringify
     * @method toString
     */

    toString() {
        return JSON.stringify(this.serialize());
    }

    // LGraphNode.prototype.deserialize = function(info) {} //this cannot be done from within, must be done in LiteGraph

    /**
     * get the title string
     * @method getTitle
     */

    getTitle() {
        return this.title ?? this.constructor.title;
    }

    /**
     * sets the value of a property
     * @method setProperty
     * @param {String} name
     * @param {*} value
     */
    setProperty(name, value) {
        this.properties ||= {};

        // Check if the new value is the same as the current value
        if (value === this.properties[name]) {
            return;
        }

        const prevValue = this.properties[name];
        this.properties[name] = value;

        // Call onPropertyChanged and revert the change if needed
        let r = this.processCallbackHandlers("onPropertyChanged",{
            def_cb: this.onPropertyChanged
        }, name, value, prevValue);
        if(r!==null && (typeof(r)=="object" && r.return_value===false)){
            this.properties[name] = prevValue;
        }

        // Update the widget value associated with the property name
        const widgetToUpdate = this.widgets?.find((widget) => widget && widget.options?.property === name);

        if (widgetToUpdate) {
            widgetToUpdate.value = value;
        }
    }



    // Execution *************************
    /**
     * sets the output data
     * @method setOutputData
     * @param {number} slot
     * @param {*} data
     */
    setOutputData(slot, data) {
        if (!this.outputs) {
            return;
        }

        /* if(slot?.constructor === String) {
            // not a niche case: consider that removable and optional slots will move indexes! just pass int value if preferred
            slot = this.findOutputSlot(slot);
        }else if (slot == -1 || slot >= this.outputs.length) {
            return;
        } */
        slot = this.getOutputSlot(slot);

        var output_info = this.outputs[slot];
        if (!output_info) {
            return;
        }

        // store data in the output itself in case we want to debug
        output_info._data = data;

        // if there are connections, pass the data to the connections
        this.outputs[slot].links?.forEach((link_id) => {
            const link = this.graph.links[link_id];
            if (link) {
                link.data = data;
            }
        });
    }

    /**
     * sets the output data type, useful when you want to be able to overwrite the data type
     * @method setOutputDataType
     * @param {number} slot
     * @param {String} datatype
     */
    setOutputDataType(slot, type) {
        if (!this.outputs) {
            return;
        }
        if (slot == -1 || slot >= this.outputs.length) {
            return;
        }
        var output_info = this.outputs[slot];
        if (!output_info) {
            return;
        }
        // store data in the output itself in case we want to debug
        output_info.type = type;

        // if there are connections, pass the data to the connections
        this.outputs[slot]?.links?.forEach((link_id) => {
            if (this.graph.links[link_id]) {
                this.graph.links[link_id].type = type;
            }
        });
    }

    /**
     * Retrieves the input data (data traveling through the connection) from one slot
     * @method getInputData
     * @param {number} slot
     * @param {boolean} force_update if set to true it will force the connected node of this slot to output data into this link
     * @return {*} data or if it is not connected returns undefined
     */
    getInputData(slot, force_update, refresh_tree) {
        if (!this.inputs) {
            return;
        } // undefined;

        if (slot >= this.inputs.length || this.inputs[slot].link == null) {
            return;
        }

        var link_id = this.inputs[slot].link;
        var link = this.graph.links[link_id];
        if (!link) {
            // bug: weird case but it happens sometimes
            LiteGraph.log_warn("lgraphnode", "getInputData", "No link", link_id, slot, this);
            return null;
        }

        if (!force_update) {
            return link.data;
        }

        // special case: used to extract data from the incoming connection before the graph has been executed
        var node = this.graph.getNodeById(link.origin_id);
        if (!node) {
            LiteGraph.log_debug("lgraphnode", "getInputData","No origin node, return the link data", link.data, link, slot, this);
            return link.data;
        }

        // atlasan: refactor: This is a basic, but seems working, version. Consider moving this out of here and use a single ancestorsCalculation (for each event?)
        if (refresh_tree) {
            LiteGraph.log_debug("lgraphnode", "getInputData","Refreshing ancestors tree", link, slot, this);
            var uIdRand = this.id+"_getInputData_forced_"+Math.floor(Math.random()*9999);
            var optsAncestors = {action: uIdRand, options: {action_call: uIdRand}};
            this.refreshAncestors(optsAncestors);
        }

        if (node.updateOutputData) { // tag: node event entrypoint
            node.updateOutputData(link.origin_slot);
        } else {
            node.doExecute();
        }

        return link.data;
    }

    /**
     * Retrieves the input data type (in case this supports multiple input types)
     * @method getInputDataType
     * @param {number} slot
     * @return {String} datatype in string format
     */
    getInputDataType(slot) {
        if (!this.inputs) {
            return null;
        } // undefined;

        if (slot >= this.inputs.length || this.inputs[slot].link == null) {
            return null;
        }
        var link_id = this.inputs[slot].link;
        var link = this.graph.links[link_id];
        if (!link) {
            // bug: weird case but it happens sometimes
            LiteGraph.log_warn("lgraphnode", "getInputDataType", "No link", link_id, slot, this);
            return null;
        }
        var node = this.graph.getNodeById(link.origin_id);
        if (!node) {
            return link.type;
        }
        var output_info = node.outputs[link.origin_slot];
        if (output_info) {
            return output_info.type;
        }
        return null;
    }

    /**
     * Retrieves the input data from one slot using its name instead of slot number
     * @method getInputDataByName
     * @param {String} slot_name
     * @param {boolean} force_update if set to true it will force the connected node of this slot to output data into this link
     * @return {*} data or if it is not connected returns null
     */
    getInputDataByName(slot_name, force_update) {
        var slot = this.findInputSlot(slot_name);
        if (slot == -1) {
            return null;
        }
        return this.getInputData(slot, force_update);
    }

    /**
     * tells you if there is a connection in one input slot
     * @method isInputConnected
     * @param {number} slot
     * @return {boolean}
     */
    isInputConnected(slot) {
        if (!this.inputs) {
            return false;
        }
        return slot < this.inputs.length && this.inputs[slot].link != null;
    }

    /**
     * tells you info about an input connection (which node, type, etc)
     * @method getInputInfo
     * @param {number} slot
     * @return {Object} object or null { link: id, name: string, type: string or 0 }
     */
    getInputInfo(slot) {
        if (!this.inputs) {
            return null;
        }
        if (slot < this.inputs.length) {
            return this.inputs[slot];
        }
        return null;
    }

    /**
     * Returns the link info in the connection of an input slot
     * @method getInputLink
     * @param {number} slot
     * @return {LiteGraph.LLink} object or null
     */
    getInputLink(slot) {
        if (!this.inputs) {
            return null;
        }
        if (slot < this.inputs.length) {
            var slot_info = this.inputs[slot];
            return this.graph.links[slot_info.link];
        }
        return null;
    }

    /**
     * returns the node connected in the input slot
     * @method getInputNode
     * @param {number} slot
     * @return {LGraphNode} node or null
     */
    getInputNode(slot) {
        if (!this.inputs) {
            return null;
        }
        if (slot >= this.inputs.length) {
            return null;
        }
        var input = this.inputs[slot];
        if (!input || input.link === null) {
            return null;
        }
        var link_info = this.graph.links[input.link];
        if (!link_info) {
            return null;
        }
        return this.graph.getNodeById(link_info.origin_id);
    }

    /**
     * returns the value of an input with this name, otherwise checks if there is a property with that name
     * @method getInputOrProperty
     * @param {string} name
     * @return {*} value
     */
    getInputOrProperty(name) {
        if (this.inputs) {
            for (var i = 0, l = this.inputs.length; i < l; ++i) {
                var input_info = this.inputs[i];
                if (name == input_info.name && input_info.link != null) {
                    var link = this.graph.links[input_info.link];
                    if (link) {
                        return link.data;
                    }
                }
            }
        }
        return this.properties ? this.properties[name] : null;
    }

    /**
     * tells you the last output data that went in that slot
     * @method getOutputData
     * @param {number} slot
     * @return {Object}  object or null
     */
    getOutputData(slot) {
        if (!this.outputs) {
            return null;
        }
        if (slot >= this.outputs.length) {
            return null;
        }

        var info = this.outputs[slot];
        return info._data;
    }

    /**
     * tells you info about an output connection (which node, type, etc)
     * @method getOutputInfo
     * @param {number} slot
     * @return {Object}  object or null { name: string, type: string, links: [ ids of links in number ] }
     */
    getOutputInfo(slot) {
        if (!this.outputs) {
            return null;
        }
        if (slot < this.outputs.length) {
            return this.outputs[slot];
        }
        return null;
    }

    /**
     * tells you if there is a connection in one output slot
     * @method isOutputConnected
     * @param {number} slot
     * @return {boolean}
     */
    isOutputConnected(slot) {
        if (!this.outputs) {
            return false;
        }
        return (
            slot < this.outputs.length &&
            this.outputs[slot].links &&
            this.outputs[slot].links.length
        );
    }

    /**
     * tells you if there is any connection in the output slots
     * @method isAnyOutputConnected
     * @return {boolean}
     */
    isAnyOutputConnected() {
        return this.outputs ? this.outputs.some((output) => output.links && output.links.length) : false;
    }

    /**
     * retrieves all the nodes connected to this output slot
     * @method getOutputNodes
     * @param {number} slot
     * @return {array}
     */
    getOutputNodes(slot) {
        if (!this.outputs || slot >= this.outputs.length) {
            return null;
        }

        const output = this.outputs[slot];
        if (!output.links || output.links.length === 0) {
            return null;
        }

        return output.links
            .map((link_id) => this.graph.links[link_id])
            .filter((link) => link)
            .map((link) => this.graph.getNodeById(link.target_id))
            .filter((target_node) => target_node);
    }

    addOnTriggerInput() {
        var trigS = this.findInputSlot("onTrigger");
        if (trigS == -1) { // !trigS ||
            this.addInput("onTrigger", LiteGraph.EVENT, {removable: true, nameLocked: true});
            return this.findInputSlot("onTrigger");
        }
        return trigS;
    }

    addOnExecutedOutput() {
        var trigS = this.findOutputSlot("onExecuted");
        if (trigS == -1) { // !trigS ||
            this.addOutput("onExecuted", LiteGraph.ACTION, {removable: true, nameLocked: true});
            return this.findOutputSlot("onExecuted");
        }
        return trigS;
    }

    onAfterExecuteNode(param, options) {
        var trigS = this.findOutputSlot("onExecuted");
        if (trigS != -1) {
            LiteGraph.log_debug("lgraphnode","onAfterExecuteNode",this.id+":"+this.order+" triggering slot onAfterExecute", param, options);
            this.triggerSlot(trigS, param, null, options);
        }
    }

    onAfterActionedNode(param, options) {
        var trigS = this.findOutputSlot("onExecuted");
        if (trigS != -1) {
            LiteGraph.log_debug("lgraphnode","onAfterActionedNode",this.id+":"+this.order+" triggering slot onAfterActionedNode", param, options);
            this.triggerSlot(trigS, param, null, options);
        }
    }

    onResize(size){
        // will eventually implement
    }

    changeMode(modeTo) {
        switch(modeTo) {

            case LiteGraph.ON_TRIGGER:
                this.addOnTriggerInput();
                this.addOnExecutedOutput();
                break;

            case LiteGraph.ON_EVENT:
                // this.addOnExecutedOutput();
                break;
            case LiteGraph.NEVER:
                break;
            case LiteGraph.ALWAYS:
                break;
            case LiteGraph.ON_REQUEST:
                break;

            default:
                return false;
        }
        this.mode = modeTo;
        return true;
    }

    /**
     * Triggers the execution of actions that were deferred when the action was triggered
     * @method executePendingActions
     */
    executePendingActions() {
        if(!this._waiting_actions || !this._waiting_actions.length)
            return;
        this._waiting_actions.forEach((p) => {
            this.onAction(p[0], p[1], p[2], p[3], p[4]);
        });
        this._waiting_actions.length = 0;
    }

    /**
     * Triggers the node code execution, place a boolean/counter to mark the node as being executed
     * @method doExecute
     * @param {*} param
     * @param {*} options
     */
    doExecute(param, options = {}) {
        // if (this.onExecute) {

            // enable this to give the event an ID
            options.action_call ??= `${this.id}_exec_${Math.floor(Math.random()*9999)}`;

            if (this.graph.nodes_executing && this.graph.nodes_executing[this.id]) {
                LiteGraph.log_debug("lgraphNODE", "doExecute", "already executing! Prevent! "+this.id+":"+this.order);
                return;
            }
            if (LiteGraph.ensureNodeSingleExecution && this.exec_version && this.exec_version >= this.graph.iteration && this.exec_version !== undefined) {
                LiteGraph.log_debug("lgraphNODE", "doExecute", "!! NODE already EXECUTED THIS STEP !! "+this.exec_version);
                return;
            }
            // LiteGraph.log_debug("Actioned ? "+this.id+":"+this.order+" :: "+this.action_call);
            if (LiteGraph.ensureUniqueExecutionAndActionCall) {
                // if(this.action_call && options && options.action_call && this.action_call == options.action_call){
                if(this.graph.nodes_executedAction[this.id] && options && options.action_call && this.graph.nodes_executedAction[this.id] == options.action_call) {
                    LiteGraph.log_debug("lgraphNODE", "doExecute", "!! NODE already ACTION THIS STEP !! "+options.action_call);
                    return;
                }
            }

            this.graph.nodes_executing[this.id] = true; // .push(this.id);

            // this.onExecute(param, options);
            this.processCallbackHandlers("onExecute",{
                def_cb: this.onExecute
            }, param, options);

            this.graph.nodes_executing[this.id] = false; // .pop();

            // save execution/action ref
            this.exec_version = this.graph.iteration;
            if(options && options.action_call) {
                this.action_call = options.action_call; // if (param)
                this.graph.nodes_executedAction[this.id] = options.action_call;
            }
        // }
        this.execute_triggered = 2; // the nFrames it will be used (-- each step), means "how old" is the event
        // callbcak after execution
        this.processCallbackHandlers("onAfterExecuteNode",{
            def_cb: this.onAfterExecuteNode
        }, param, options);
    }
    /**
     * retrocompatibility :: old doExecute
     * @method doExecute
     * @param {*} param
     * @param {*} options
     */
    execute(param, options = {}) {
        LiteGraph.log_debug("lgraphnode","execute","You should replace .execute with .doExecute, has been renamed");
        return this.doExecute(param, options);
    }

    /**
     * Triggers an action, wrapped by logics to control execution flow
     * @method actionDo
     * @param {String} action name
     * @param {*} param
     */
    actionDo(action, param, options = {}, action_slot) {
        // if (this.onAction) {

            // enable this to give the event an ID
            options.action_call ??= `${this.id}_${action?action:"action"}_${Math.floor(Math.random()*9999)}`;

            if (LiteGraph.ensureNodeSingleAction) {
                if (this.graph.nodes_actioning && this.graph.nodes_actioning[this.id] == options.action_call) { // == action){
                    LiteGraph.log_debug("lgraphnode", "actionDo", "already actioning! Prevent! "+this.id+":"+this.order+" :: "+options.action_call);
                    return;
                }
            }
            LiteGraph.log_debug("CheckActioned ? "+this.id+":"+this.order+" :: "+this.action_call);
            if (LiteGraph.ensureUniqueExecutionAndActionCall) {
                // if(this.action_call && options && options.action_call && this.action_call == options.action_call){
                if(this.graph.nodes_executedAction[this.id] && options && options.action_call && this.graph.nodes_executedAction[this.id] == options.action_call) {
                    LiteGraph.log_debug("lgraphnode", "actionDo", "!! NODE already ACTION THIS STEP !! "+options.action_call);
                    return;
                }
            }

            this.graph.nodes_actioning[this.id] = (action?action:"actioning"); // .push(this.id);

            // this.onAction(action, param, options, action_slot);
            this.processCallbackHandlers("onAction",{
                def_cb: this.onAction
            }, action, param, options, action_slot);

            this.graph.nodes_actioning[this.id] = false; // .pop();

            // save execution/action ref
            if(options && options.action_call) {
                this.action_call = options.action_call; // if (param)
                this.graph.nodes_executedAction[this.id] = options.action_call;
            }
        // }
        this.action_triggered = 2; // the nFrames it will be used (-- each step), means "how old" is the event
        // callback on after actioned
        // TODO check if should trigger slots like when executing or not
        this.processCallbackHandlers("onAfterActionedNode",{
            def_cb: this.onAfterActionedNode
        }, param, options);
    }

    /**
     * Triggers an event in this node, this will trigger any output with the same name
     * @method trigger
     * @param {String} event name ( "on_play", ... ) if action is equivalent to false then the event is send to all
     * @param {*} param
     */
    trigger(action, param, options) {
        if (!this.outputs || this.outputs.length === 0) {
            return;
        }

        // TODO check this, investigate, _last_trigger_time ? who calls trigger ?
        this.graph && (this.graph._last_trigger_time = LiteGraph.getTime());

        let triggered = 0;
        this.outputs.forEach((output, i) => {
            if (output && output.type === LiteGraph.EVENT && (!action || output.name === action)) {
                // TODO add callback handler onTriggerSlot
                LiteGraph.log_verbose("lgraphnode", "trigger", "triggering slot", i, param, options);
                this.triggerSlot(i, param, null, options);
                triggered++;
            }else{
                LiteGraph.log_verbose("lgraphnode", "trigger", "skip slot", output);
            }
        });
        if(!triggered){
            LiteGraph.log_debug("lgraphnode", "trigger", "nothing found", ...arguments);
        }
    }

    /**
     * Triggers a slot event in this node: cycle output slots and launch execute/action on connected nodes
     * @method triggerSlot
     * @param {Number} slot the index of the output slot
     * @param {*} param
     * @param {Number} link_id [optional] in case you want to trigger and specific output link in a slot
     */
    triggerSlot(slot, param, link_id, options = {}) {
        if (!this.outputs) {
            return;
        }
        if(slot === null) {
            LiteGraph.log_error("lgraphnode", "triggerSlot","wrong slot",slot);
            return;
        }
        if(slot.constructor !== Number){
            // LiteGraph.log_warn("lgraphnode", "triggerSlot","slot must be a number, use node.trigger('name') if you want to use a string");
            slot = this.getOutputSlot(slot);
        }
        var output = this.outputs[slot];
        if (!output) {
            return;
        }

        var links = output.links;
        if (!links || !links.length) {
            return;
        }

        // check for ancestors calls
        if (this.graph && this.graph.ancestorsCall) {
            // LiteGraph.log_debug("ancestors call, prevent triggering slot "+slot+" on "+this.id+":"+this.order);
            return;
        }

        if (this.graph) {
            this.graph._last_trigger_time = LiteGraph.getTime();
        }

        // for every link attached here
        for (var k = 0; k < links.length; ++k) {
            var id = links[k];
            if (link_id != null && link_id != id) {
                // to skip links
                continue;
            }
            var link_info = this.graph.links[links[k]];
            if (!link_info) {
                // not connected
                continue;
            }
            link_info._last_time = LiteGraph.getTime();
            var node = this.graph.getNodeById(link_info.target_id);
            if (!node) {
                // node not found?
                continue;
            }

            if (node.mode === LiteGraph.ON_TRIGGER) {
                // generate unique trigger ID if not present
                if (!options.action_call)
                    options.action_call = `${this.id}_trigg_${Math.floor(Math.random()*9999)}`; // TODO replace here and there fakeunique ID with real unique
                if (LiteGraph.refreshAncestorsOnTriggers)
                    node.refreshAncestors({action: "trigger", param: param, options: options});
                if (node.onExecute) {
                    // -- wrapping node.onExecute(param); --
                    node.doExecute(param, options);
                }
            } else if (node.onAction) {
                // generate unique action ID if not present
                if (!options.action_call) options.action_call = `${this.id}_act_${Math.floor(Math.random()*9999)}`;
                // pass the action name
                let target_connection = node.inputs[link_info.target_slot];
                
                // METHOD 1 ancestors
                if (LiteGraph.refreshAncestorsOnActions)
                    node.refreshAncestors({action: target_connection.name, param: param, options: options});

                // instead of executing them now, it will be executed in the next graph loop, to ensure data flow
                if(LiteGraph.use_deferred_actions && node.onExecute) {
                    node._waiting_actions ??= [];
                    node._waiting_actions.push([target_connection.name, param, options, link_info.target_slot]);
                    LiteGraph.log_debug("lgraphnode", "triggerSlot","push to deferred", target_connection.name, param, options, link_info.target_slot);//+this.id+":"+this.order+" :: "+target_connection.name);
                } else {
                    // wrap node.onAction(target_connection.name, param);
                    LiteGraph.log_debug("lgraphnode", "triggerSlot","call actionDo", node, target_connection.name, param, options, link_info.target_slot);
                    node.actionDo( target_connection.name, param, options, link_info.target_slot );
                }
            }
        }
    }

    /**
     * clears the trigger slot animation
     * @method clearTriggeredSlot
     * @param {Number} slot the index of the output slot
     * @param {Number} link_id [optional] in case you want to trigger and specific output link in a slot
     */
    clearTriggeredSlot(slot, link_id) {
        if (!this.outputs || !this.outputs[slot] || !this.outputs[slot].links) {
            return;
        }

        this.outputs[slot].links.forEach((id) => {
            if (link_id !== null && link_id !== id) {
                // Skip links
                return;
            }

            const link_info = this.graph.links[id];
            if (!link_info) {
                // Not connected
                return;
            }

            link_info._last_time = 0;
        });
    }

    /**
     * changes node size and triggers callback
     * @method setSize
     * @param {vec2} size
     */
    setSize(size) {
        this.size = size;
        this.processCallbackHandlers("onResize",{
            def_cb: this.onResize
        }, this.size);
    }

    /**
     * add a new property to this node
     * @method addProperty
     * @param {string} name
     * @param {*} default_value
     * @param {string} type string defining the output type ("vec3","number",...)
     * @param {Object} extra_info this can be used to have special properties of the property (like values, etc)
     */
    addProperty(name, default_value, type, extra_info) {
        const o = { name, type, default_value, ...extra_info };
        this.properties_info = this.properties_info ?? [];
        this.properties_info.push(o);

        this.properties = this.properties ?? {};
        this.properties[name] = default_value;

        return o;
    }

    /**
     * Add a new input or output slot to use in this node.
     * @param {string} name - Name of the slot.
     * @param {string} type - Type of the slot ("vec3", "number", etc). For a generic type, use "0".
     * @param {Object} extra_info - Additional information for the slot (e.g., label, color, position).
     * @param {boolean} isInput - Whether the slot being added is an input slot.
     * @returns {Object} The newly added slot (input or output).
     *
     * @NOTE: These methods are slightly different, and it would be optimal to keep them separate,
     * but our goal here is to refactor them so they *aren't* slightly different.
     */
    addInput(name, type, extra_info) {
        return this.addSlot(name, type, extra_info, true);
    }
    addOutput(name, type, extra_info) {
        return this.addSlot(name, type, extra_info, false);
    }
    addSlot(name, type, extra_info, isInput) {
        const slot = isInput ?
            { name, type, link: null, ...extra_info }:
            { name, type, links: null, ...extra_info };
        if (isInput) {
            this.inputs = this.inputs ?? [];
            this.inputs.push(slot);
            this.processCallbackHandlers("onInputAdded",{
                def_cb: this.onInputAdded
            }, slot);
            LiteGraph.registerNodeAndSlotType(this, type);
        } else {
            this.outputs = this.outputs ?? [];
            this.outputs.push(slot);
            this.processCallbackHandlers("onOutputAdded",{
                def_cb: this.onOutputAdded
            }, slot);
            if (LiteGraph.auto_load_slot_types) {
                LiteGraph.registerNodeAndSlotType(this, type, true);
            }
        }

        this.setSize(this.computeSize());
        this.setDirtyCanvas(true, true);
        return slot;
    }

    /**
     * Add multiple input or output slots to use in this node.
     * @param {Array} array - Array of triplets like [[name, type, extra_info], [...]].
     * @param {boolean} isInput - Whether the slots being added are input slots.
     *
     * @NOTE: These methods are slightly different, and it would be optimal to keep them separate,
     * but our goal here is to refactor them so they *aren't* slightly different.
     */
    addInputs(array) {
        this.addSlots(array, true);
    }
    addOutputs(array) {
        this.addSlots(array, false);
    }
    addSlots(array, isInput) {
        if(typeof array === 'string')
            array = [array];

        array.forEach((info) => {
            const slot = isInput ? {
                name: info[0],
                type: info[1],
                link: null,
                ...(info[2] ?? {}),
            } : {
                name: info[0],
                type: info[1],
                links: null,
                ...(info[2] ?? {}),
            };

            if (isInput) {
                this.inputs = this.inputs ?? [];
                this.inputs.push(slot);
                this.processCallbackHandlers("onInputAdded",{
                    def_cb: this.onInputAdded
                }, slot);
                LiteGraph.registerNodeAndSlotType(this, info[1]);
            } else {
                this.outputs = this.outputs ?? [];
                this.outputs.push(slot);
                this.processCallbackHandlers("onOutputAdded",{
                    def_cb: this.onOutputAdded
                }, slot);
                if (LiteGraph.auto_load_slot_types) {
                    LiteGraph.registerNodeAndSlotType(this, info[1], true);
                }
            }
        });

        this.setSize(this.computeSize());
        this.setDirtyCanvas(true, true);
    }

    /**
     * remove an existing input slot
     * @method removeInput
     * @param {number} slot
     *
     * @NOTE: These two are different enough yet I can't even mash them together meaningfully.
     */
    removeInput(slot) {
        this.disconnectInput(slot);
        const removedInput = this.inputs.splice(slot, 1)[0];

        this.inputs.slice(slot).filter((input) => !!input).forEach((input) => {
            const link = this.graph.links[input.link];
            link?.target_slot && link.target_slot--;
        });

        this.setSize(this.computeSize());
        this.processCallbackHandlers("onInputRemoved",{
            def_cb: this.onInputRemoved
        }, slot, removedInput);
        this.setDirtyCanvas(true, true);
    }

    /**
     * remove an existing output slot
     * @method removeOutput
     * @param {number} slot
     */
    removeOutput(slot) {
        this.disconnectOutput(slot);
        this.outputs = this.outputs.filter((_, index) => index !== slot);

        this.outputs.slice(slot).forEach((output) => {
            if (!output || !output.links) {
                return;
            }
            output.links.forEach((linkId) => {
                const link = this.graph.links[linkId];
                if (link) {
                    link.origin_slot -= 1;
                }
            });
        });

        this.setSize(this.computeSize());
        this.processCallbackHandlers("onOutputRemoved",{
            def_cb: this.onOutputRemoved
        }, slot);
        this.setDirtyCanvas(true, true);
    }

    /**
     * Add a special connection to this node (used for special kinds of graphs)
     * @method addConnection
     * @param {string} name - The name of the connection
     * @param {string} type - String defining the input type ("vec3", "number", etc.)
     * @param {Float32[]} pos - Position of the connection inside the node as an array [x, y]
     * @param {string} direction - Specifies if it is an input or output connection
     */
    addConnection(name, type, pos, direction) {
        var o = {
            name: name,
            type: type,
            pos: pos,
            direction: direction,
            links: null,
        };
        this.connections.push(o);
        return o;
    }

    /**
     * computes the minimum size of a node according to its inputs and output slots
     * @method computeSize
     * @param {vec2} minHeight
     * @return {vec2} the total size
     */
    computeSize(out) {
        if (this.constructor.size) {
            return this.constructor.size.concat();
        }

        var size = out || new Float32Array([0, 0]);

        var font_size = LiteGraph.NODE_TEXT_SIZE; // although it should be graphcanvas.inner_text_font size

        // computeWidth
        const get_text_width = (text) => {
            if (!text) {
                return 0;
            }
            return font_size * text.length * 0.6;
        };
        var title_width = get_text_width(this.title);
        var input_width = 0;
        var output_width = 0;

        if (this.inputs) {
            input_width = this.inputs.reduce((maxWidth, input) => {
                const text = input.label || input.name || "";
                const text_width = get_text_width(text);
                return Math.max(maxWidth, text_width);
            }, 0);
        }
        if (this.outputs) {
            output_width = this.outputs.reduce((maxWidth, output) => {
                const text = output.label || output.name || "";
                const text_width = get_text_width(text);

                return Math.max(maxWidth, text_width);
            }, 0);
        }

        size[0] = Math.max(input_width + output_width + 10, title_width);
        size[0] = Math.max(size[0], LiteGraph.NODE_WIDTH);
        if (this.widgets && this.widgets.length) {
            size[0] = Math.max(size[0], LiteGraph.NODE_WIDTH * 1.5);
        }

        // computeHeight

        // minimum height calculated by slots or 1
        const rowHeight = Math.max(
            this.inputs ? this.inputs.length : 1,
            this.outputs ? this.outputs.length : 1,
            1,
        ) * LiteGraph.NODE_SLOT_HEIGHT;

        // add margin (should this be always?)
        size[1] = rowHeight + (this.constructor.slot_start_y || 0);

        // minimum height calculated by widgets
        let widgetsHeight = 0;
        if (this.widgets && this.widgets.length) {
            for (var i = 0, l = this.widgets.length; i < l; ++i) {
                if (this.widgets[i].computeSize)
                    widgetsHeight += this.widgets[i].computeSize(size[0])[1] + 4;
                else
                    widgetsHeight += LiteGraph.NODE_WIDGET_HEIGHT + 4;
            }
            widgetsHeight += 8;
        }

        // compute height using widgets height
        if( this.widgets_up )
            size[1] = Math.max( size[1], widgetsHeight );
        else if( this.widgets_start_y != null )
            size[1] = Math.max( size[1], widgetsHeight + this.widgets_start_y );
        else
            size[1] += widgetsHeight;
        if (
            this.constructor.min_height &&
            size[1] < this.constructor.min_height
        ) {
            size[1] = this.constructor.min_height;
        }

        size[1] += 6; // margin
        return size;
    }

    /**
     * returns all the info available about a property of this node.
     *
     * @method getPropertyInfo
     * @param {String} property name of the property
     * @return {Object} the object with all the available info
    */
    getPropertyInfo(property) {
        var info = null;

        // there are several ways to define info about a property
        // legacy mode
        if (this.properties_info) {
            for (var i = 0; i < this.properties_info.length; ++i) {
                if (this.properties_info[i].name == property) {
                    info = this.properties_info[i];
                    break;
                }
            }
        }
        // litescene mode using the constructor
        if(this.constructor[`@${property}`])
            info = this.constructor[`@${property}`];

        if(this.constructor.widgets_info && this.constructor.widgets_info[property])
            info = this.constructor.widgets_info[property];

        // litescene mode using the constructor
        if (!info) {
            // info = this.onGetPropertyInfo(property);
            let r = this.processCallbackHandlers("onGetPropertyInfo",{
                def_cb: this.onGetPropertyInfo
            }, property);
            if(r!==null && typeof(r)=="object" && r.return_value!==null){
                info = r.return_value;
            }
        }

        if (!info)
            info = {};
        if(!info.type)
            info.type = typeof this.properties[property];
        if(info.widget == "combo")
            info.type = "enum";

        return info;
    }

    /**
     * Defines a widget inside the node, it will be rendered on top of the node, you can control lots of properties
     *
     * @method addWidget
     * @param {String} type the widget type (could be "number","string","combo"
     * @param {String} name the text to show on the widget
     * @param {String} value the default value
     * @param {Function|String} callback function to call when it changes (optionally, it can be the name of the property to modify)
     * @param {Object} options the object that contains special properties of this widget
     * @return {Object} the created widget object
     */
    addWidget(type, name, value, callback, options) {
        this.widgets ??= [];

        if(!options && callback && callback.constructor === Object) {
            options = callback;
            callback = null;
        }

        if(options && options.constructor === String) // options can be the property name
            options = { property: options };

        if(callback && callback.constructor === String) { // callback can be the property name
            options ??= {};
            options.property = callback;
            callback = null;
        }

        if(callback && callback.constructor !== Function) {
            LiteGraph.log_warn("lgraphnode", "addWidget", "callback must be a function", callback);
            callback = null;
        }

        var w = {
            type: type.toLowerCase(),
            name: name,
            value: value,
            callback: callback,
            options: options || {},
        };

        if (w.options.y !== undefined) {
            w.y = w.options.y;
        }

        if (!callback && !w.options.callback && !w.options.property) {
            
        }
        if (type == "combo" && !w.options.values) {
            // throw Error("LiteGraph addWidget('combo',...) requires to pass values in options: { values:['red','blue'] }");
            LiteGraph.log_warn("lgraphnode", "addWidget", "combo requires to pass values in options eg: { values:['red','blue'] }");
            return;
        }
        this.widgets.push(w);
        this.setSize( this.computeSize() );
        return w;
    }

    addCustomWidget(custom_widget) {
        this.widgets ??= [];
        this.widgets.push(custom_widget);
        return custom_widget;
    }

    /**
     * Returns the bounding box of the object, used for rendering purposes
     * @method getBounding
     * @param {Float32[]} [out] - [Optional] A place to store the output to reduce garbage
     * @param {boolean} [compute_outer] - [Optional] Set to true to include the shadow and connection points in the bounding calculation
     * @return {Float32[]} The bounding box in the format of [topLeftCornerX, topLeftCornerY, width, height]
     */
    getBounding(out = new Float32Array(4), compute_outer) {
        const nodePos = this.pos;
        const isCollapsed = this.flags?.collapsed;
        const nodeSize = this.size;

        let left_offset = 0;
        // 1 offset due to how nodes are rendered
        let right_offset = 1 ;
        let top_offset = 0;
        let bottom_offset = 0;

        if (compute_outer) {
            // 4 offset for collapsed node connection points
            left_offset = 4;
            // 6 offset for right shadow and collapsed node connection points
            right_offset = 6 + left_offset;
            // 4 offset for collapsed nodes top connection points
            top_offset = 4;
            // 5 offset for bottom shadow and collapsed node connection points
            bottom_offset = 5 + top_offset;
        }

        out[0] = nodePos[0] - left_offset;
        out[1] = nodePos[1] - LiteGraph.NODE_TITLE_HEIGHT - top_offset;
        out[2] = isCollapsed ?
            (this._collapsed_width || LiteGraph.NODE_COLLAPSED_WIDTH) + right_offset :
            nodeSize[0] + right_offset;
        out[3] = isCollapsed ?
            LiteGraph.NODE_TITLE_HEIGHT + bottom_offset :
            nodeSize[1] + LiteGraph.NODE_TITLE_HEIGHT + bottom_offset;

        this.processCallbackHandlers("onBounding",{
            def_cb: this.onBounding
        }, out)
        // TAG this callback could return behavior
        return out;
    }

    /**
     * checks if a point is inside the shape of a node
     * @method isPointInside
     * @param {number} x
     * @param {number} y
     * @return {boolean}
     */
    isPointInside(x, y, margin = 0, skip_title) {
        var margin_top = this.graph && this.graph.isLive() ? 0 : LiteGraph.NODE_TITLE_HEIGHT;
        if (skip_title) {
            margin_top = 0;
        }
        if (this.flags && this.flags.collapsed) {
            // if ( distance([x,y], [this.pos[0] + this.size[0]*0.5, this.pos[1] + this.size[1]*0.5]) < LiteGraph.NODE_COLLAPSED_RADIUS)
            if (
                LiteGraph.isInsideRectangle(
                    x,
                    y,
                    this.pos[0] - margin,
                    this.pos[1] - LiteGraph.NODE_TITLE_HEIGHT - margin,
                    (this._collapsed_width || LiteGraph.NODE_COLLAPSED_WIDTH) +
                        2 * margin,
                    LiteGraph.NODE_TITLE_HEIGHT + 2 * margin,
                )
            ) {
                return true;
            }
        } else if (
            this.pos[0] - 4 - margin < x &&
            this.pos[0] + this.size[0] + 4 + margin > x &&
            this.pos[1] - margin_top - margin < y &&
            this.pos[1] + this.size[1] + margin > y
        ) {
            return true;
        }
        return false;
    }

    /**
     * checks if a point is inside a node slot, and returns info about which slot
     * @method getSlotInPosition
     * @param {number} x
     * @param {number} y
     * @return {Object} if found the object contains { input|output: slot object, slot: number, link_pos: [x,y] }
     */
    getSlotInPosition(x, y) {
        // search for inputs
        var link_pos = new Float32Array(2);
        if (this.inputs) {
            for (let i = 0, l = this.inputs.length; i < l; ++i) {
                let input = this.inputs[i];
                this.getConnectionPos(true, i, link_pos);
                if (
                    LiteGraph.isInsideRectangle(
                        x,
                        y,
                        link_pos[0] - 10,
                        link_pos[1] - 5,
                        20,
                        10,
                    )
                ) {
                    return { input: input, slot: i, link_pos: link_pos };
                }
            }
        }

        if (this.outputs) {
            for (let i = 0, l = this.outputs.length; i < l; ++i) {
                let output = this.outputs[i];
                this.getConnectionPos(false, i, link_pos);
                if (
                    LiteGraph.isInsideRectangle(
                        x,
                        y,
                        link_pos[0] - 10,
                        link_pos[1] - 5,
                        20,
                        10,
                    )
                ) {
                    return { output: output, slot: i, link_pos: link_pos };
                }
            }
        }

        return null;
    }

    /**
     * returns the input slot with a given name (used for dynamic slots), -1 if not found
     * @method findInputSlot
     * @param {string} name the name of the slot
     * @param {boolean} returnObj if the obj itself wanted
     * @return {number|object} the slot (-1 if not found)
     */
    findInputSlot(name, returnObj) {
        if (!this.inputs) {
            return -1;
        }
        for (var i = 0, l = this.inputs.length; i < l; ++i) {
            if (name == this.inputs[i].name) {
                return !returnObj ? i : this.inputs[i];
            }
        }
        return -1;
    }

    /**
     * returns the output slot with a given name (used for dynamic slots), -1 if not found
     * @method findOutputSlot
     * @param {string} name the name of the slot
     * @param {boolean} returnObj if the obj itself wanted
     * @return {number|object} the slot (-1 if not found)
     */
    findOutputSlot(name, returnObj = false) {
        if (!this.outputs) {
            return -1;
        }
        for (var i = 0, l = this.outputs.length; i < l; ++i) {
            if (name == this.outputs[i].name) {
                return !returnObj ? i : this.outputs[i];
            }
        }
        return -1;
    }

    /**
     * Get a slot from his index or name
     * @param {boolean} is_input use look for input / output 
     * @param {number|string} slot_index_or_name 
     * @returns 
     */
    getSlot(is_input, slot_index_or_name, returnObj = false){
        if(!is_input || is_input===LiteGraph.OUTPUT){
            if(this.outputs[slot_index_or_name]!=="undefined"){
                return !returnObj ? slot_index_or_name : this.outputs[slot_index_or_name];
            }else{
                return this.findInputSlot(slot_index_or_name, returnObj);
            }
        }else{
            if(this.inputs[slot_index_or_name]!=="undefined"){
                return !returnObj ? slot_index_or_name : this.inputs[slot_index_or_name];
            }else{
                return this.findOutputSlot(slot_index_or_name, returnObj);
            }
        }
    }
    getOutputSlot(index_or_name, returnObj = false){
        return this.getSlot(false, index_or_name, returnObj);
    }
    getInputSlot(index_or_name, returnObj = false){
        return this.getSlot(true, index_or_name, returnObj);
    }

    // TODO refactor: USE SINGLE findInput/findOutput functions! :: merge options

    /**
     * returns the first free input slot, can filter by types
     * @method findInputSlotFree
     * @param {object} options
     * @return {number|object} the slot (-1 if not found)
     */
    findInputSlotFree(optsIn = {}) {
        var optsDef = {
            returnObj: false,
            typesNotAccepted: [],
        };
        var opts = Object.assign(optsDef,optsIn);
        if (!this.inputs) {
            return -1;
        }
        for (var i = 0, l = this.inputs.length; i < l; ++i) {
            if (this.inputs[i].link && this.inputs[i].link != null) {
                continue;
            }
            if (opts.typesNotAccepted && opts.typesNotAccepted.includes && opts.typesNotAccepted.includes(this.inputs[i].type)) {
                continue;
            }
            return !opts.returnObj ? i : this.inputs[i];
        }
        return -1;
    }

    /**
     * returns the first output slot free, can filter by types
     * @method findOutputSlotFree
     * @param {object} options
     * @return {number|object} the slot (-1 if not found)
     */
    findOutputSlotFree(optsIn = {}) {
        var optsDef = {
            returnObj: false,
            typesNotAccepted: [],
        };
        var opts = Object.assign(optsDef,optsIn);
        if (!this.outputs) {
            return -1;
        }
        for (let i = 0, l = this.outputs.length; i < l; ++i) {
            if (this.outputs[i].links && this.outputs[i].links != null) {
                continue;
            }
            if (opts.typesNotAccepted && opts.typesNotAccepted.includes && opts.typesNotAccepted.includes(this.outputs[i].type)) {
                continue;
            }
            return !opts.returnObj ? i : this.outputs[i];
        }
        return -1;
    }

    /**
     * findSlotByType for INPUTS
     */
    findInputSlotByType(type, returnObj, preferFreeSlot, doNotUseOccupied) {
        return this.findSlotByType(true, type, returnObj, preferFreeSlot, doNotUseOccupied);
    }

    /**
     * findSlotByType for OUTPUTS
     */
    findOutputSlotByType(type, returnObj, preferFreeSlot, doNotUseOccupied) {
        return this.findSlotByType(false, type, returnObj, preferFreeSlot, doNotUseOccupied);
    }

    /**
     * returns the output (or input) slot with a given type, -1 if not found
     * @method findSlotByType
     * @param {boolean} input use inputs (true), or outputs (false)
     * @param {string} type the type of the slot to look for (multi type by ,) 
     * @param {boolean} returnObj if the obj itself wanted
     * @param {boolean} preferFreeSlot if we want a free slot (if not found, will return the first of the type anyway)
     * @return {number|object} the slot (-1 if not found)
     */
    findSlotByType(
        input = false,
        type,
        returnObj = false,
        preferFreeSlot = false,
        doNotUseOccupied = false,
    ) {
        var aSlots = input ? this.inputs : this.outputs;
        if (!aSlots) {
            return -1;
        }
        // !! empty string type is considered 0, * !!
        if (!type || type == "" || type == "*") type = 0;
        // cycle for this slots
        for (let i = 0, l = aSlots.length; i < l; ++i) {
            let aSource = (type+"").toLowerCase().split(",");
            let aDest = aSlots[i].type=="0" || aSlots[i].type=="*"
                            ? 0
                            : aSlots[i].type;
            aDest = (aDest+"").toLowerCase().split(",");
            // cycle for the slot types
            for(let sI=0;sI<aSource.length;sI++) {
                for(let dI=0;dI<aDest.length;dI++) {
                    if (aSource[sI]=="_event_") aSource[sI] = LiteGraph.EVENT;
                    if (aDest[sI]=="_event_") aDest[sI] = LiteGraph.EVENT;
                    if (aSource[sI]=="*") aSource[sI] = 0;
                    if (aDest[sI]=="*") aDest[sI] = 0;
                    if (aSource[sI] == aDest[dI]) {
                        if (preferFreeSlot
                            && (
                                (aSlots[i].link && aSlots[i].link !== null)
                                || (aSlots[i].links && aSlots[i].links !== null)
                            )
                        ){
                            LiteGraph.log_verbose("lgraphnode","findSlotByType","preferFreeSlot but has link",aSource[sI],aDest[dI],"from types",type,"checked types",aSlots[i].type);
                            continue;
                        }
                        LiteGraph.log_verbose("lgraphnode","findSlotByType","found right type",i,aSlots[i],"from types",type,"checked types",aSlots[i].type);
                        return !returnObj ? i : aSlots[i];
                    }else{
                        LiteGraph.log_verbose("lgraphnode","findSlotByType","slot not right type",aSource[sI],aDest[dI],"from types",type,"checked types",aSlots[i].type);
                    }
                }
            }
        }
        // if didnt find some, checking if need to force on already placed ones
        if (preferFreeSlot && !doNotUseOccupied) {
            for (let i = 0, l = aSlots.length; i < l; ++i) {
                let aSource = (type+"").toLowerCase().split(",");
                let aDest = aSlots[i].type=="0"||aSlots[i].type=="*"?"0":aSlots[i].type;
                aDest = (aDest+"").toLowerCase().split(",");
                for(let sI=0;sI<aSource.length;sI++) {
                    for(let dI=0;dI<aDest.length;dI++) {
                        if (aSource[sI]=="*") aSource[sI] = 0;
                        if (aDest[sI]=="*") aDest[sI] = 0;
                        if (aSource[sI] == aDest[dI]) {
                            return !returnObj ? i : aSlots[i];
                        }
                    }
                }
            }
        }
        return -1;
    }

    /**
     * connect this node output to the input of another node BY TYPE
     * @method connectByType
     * @param {number|string} slot (could be the number of the slot or the string with the name of the slot)
     * @param {LGraphNode} node the target node
     * @param {string} target_type the input slot type of the target node
     * @return {Object} the link_info is created, otherwise null
     */
    connectByType(slot, target_node, target_slotType = "*", optsIn = {}) {
        var optsDef = {
            createEventInCase: true,
            firstFreeIfOutputGeneralInCase: true,
            generalTypeInCase: true,
            preferFreeSlot: false,
        };
        var opts = Object.assign(optsDef,optsIn);
        if (target_node && target_node.constructor === Number) {
            target_node = this.graph.getNodeById(target_node);
        }
        // look for free slots
        var target_slot = target_node.findInputSlotByType(target_slotType, false, true);
        if (target_slot >= 0 && target_slot !== null) {
            LiteGraph.log_debug("lgraphnode","connectByType","type "+target_slotType+" for "+target_slot)
            return this.connect(slot, target_node, target_slot);
        }else{
            // LiteGraph.log?.("type "+target_slotType+" not found or not free?")
            if (opts.createEventInCase && target_slotType == LiteGraph.EVENT) {
                // WILL CREATE THE onTrigger IN SLOT
                LiteGraph.log_debug("lgraphnode","connectByType","connect WILL CREATE THE onTrigger "+target_slotType+" to "+target_node);
                return this.connect(slot, target_node, -1);
            }
            // connect to the first general output slot if not found a specific type and
            if (opts.generalTypeInCase) {
                target_slot = target_node.findInputSlotByType(0, false, true, true);
                LiteGraph.log_debug("lgraphnode","connectByType","connect TO a general type (*, 0), if not found the specific type ",target_slotType," to ",target_node,"RES_SLOT:",target_slot);
                if (target_slot >= 0) {
                    return this.connect(slot, target_node, target_slot);
                }
            }
            // connect to the first free input slot if not found a specific type and this output is general
            if (opts.firstFreeIfOutputGeneralInCase && (target_slotType == 0 || target_slotType == "*" || target_slotType == "")) {
                target_slot = target_node.findInputSlotFree({typesNotAccepted: [LiteGraph.EVENT] });
                LiteGraph.log_debug("lgraphnode","connectByType","connect TO TheFirstFREE ",target_slotType," to ",target_node,"RES_SLOT:",target_slot);
                if (target_slot >= 0) {
                    return this.connect(slot, target_node, target_slot);
                }
            }
            LiteGraph.log_debug("lgraphnode","connectByType","no way to connect type: ",target_slotType," to targetNODE ",target_node);
            // TODO filter

            return null;
        }
    }

    /**
     * connect this node input to the output of another node BY TYPE
     * @method connectByType
     * @param {number|string} slot (could be the number of the slot or the string with the name of the slot)
     * @param {LGraphNode} node the target node
     * @param {string} target_type the output slot type of the target node
     * @return {Object} the link_info is created, otherwise null
     */
    connectByTypeOutput(slot, source_node, source_slotType = "*", optsIn = {}) {
        var optsDef = {
            createEventInCase: true,
            firstFreeIfInputGeneralInCase: true,
            generalTypeInCase: true,
        };
        var opts = Object.assign(optsDef,optsIn);
        if (source_node && source_node.constructor === Number) {
            source_node = this.graph.getNodeById(source_node);
        }
        var source_slot = source_node.findOutputSlotByType(source_slotType, false, true);
        if (source_slot >= 0 && source_slot !== null) {
            LiteGraph.log_debug("lgraphnode","connectByTypeOutput","type "+source_slotType+" for "+source_slot)
            return source_node.connect(source_slot, this, slot);
        }else{

            // connect to the first general output slot if not found a specific type and
            if (opts.generalTypeInCase) {
                source_slot = source_node.findOutputSlotByType(0, false, true, true);
                if (source_slot >= 0) {
                    return source_node.connect(source_slot, this, slot);
                }
            }

            if (opts.createEventInCase && source_slotType == LiteGraph.EVENT) {
                // WILL CREATE THE onExecuted OUT SLOT
                if (LiteGraph.do_add_triggers_slots) {
                    source_slot = source_node.addOnExecutedOutput();
                    return source_node.connect(source_slot, this, slot);
                }
            }
            // connect to the first free output slot if not found a specific type and this input is general
            if (opts.firstFreeIfInputGeneralInCase && (source_slotType == 0 || source_slotType == "*" || source_slotType == "" || source_slotType == "undefined")) {
                source_slot = source_node.findOutputSlotFree({typesNotAccepted: [LiteGraph.EVENT] });
                if (source_slot >= 0) {
                    return source_node.connect(source_slot, this, slot);
                }
            }

            LiteGraph.log_debug("lgraphnode","connectByTypeOutput","no way to connect (not found or not free?) byOUT type: ",source_slotType," to sourceNODE ",source_node);
            // TODO filter

            return null;
        }
    }

    /**
     * connect this node output to the input of another node
     * @method connect
     * @param {number|string} slot (could be the number of the slot or the string with the name of the slot)
     * @param {LGraphNode} node the target node
     * @param {number|string} target_slot the input slot of the target node (could be the number of the slot or the string with the name of the slot, or -1 to connect a trigger)
     * @return {Object} the link_info is created, otherwise null
     */
    connect(slot, target_node, target_slot = 0) {
        if (!this.graph) {
            // could be connected before adding it to a graph
            LiteGraph.log_warn("lgraphnode","connect", "Error, node doesn't belong to any graph. Nodes must be added first to a graph before connecting them.", this); // due to link ids being associated with graphs
            return null;
        }

        let r = null;

        // seek for the output slot
        /* if (slot.constructor === String) {
            slot = this.findOutputSlot(slot);
            if (slot == -1) {
                LiteGraph.log_warn("lgraphnode","connect", "Error, string slot not found",this,slot);
                return null;
            }
        } else if (!this.outputs || slot >= this.outputs.length) {
            LiteGraph.log_warn("lgraphnode","connect", "Error, number slot not found",this,slot);
            return null;
        } */
        slot = this.getOutputSlot(slot);
        if(slot == -1){
            LiteGraph.log_warn("lgraphnode","connect", "Slot not found",this,slot);
            return null;
        }

        if (target_node && target_node.constructor === Number) { // check this ? Number constructor falling back to ID ?
            LiteGraph.log_debug("lgraphnode","connect", "Target node constructor is number",target_node);
            target_node = this.graph.getNodeById(target_node);
            LiteGraph.log_debug("lgraphnode","connect", "Target node number constructor, looked for node by ID",target_node);
        }
        if (!target_node) {
            // throw new Error("target node is null");
            LiteGraph.log_warn("lgraphnode","connect", "Target node null",target_node);
            return;
        }

        // avoid loopback
        if (target_node == this) {
            return null;
        }

        if (target_slot === LiteGraph.EVENT) {

            if (LiteGraph.do_add_triggers_slots) {
                // search for first slot with event? :: NO this is done outside
                // LiteGraph.log?.("Connect: Creating triggerEvent");
                // force mode
                target_node.changeMode(LiteGraph.ON_TRIGGER);
                target_slot = target_node.findInputSlot("onTrigger");
                LiteGraph.log_debug("lgraphnode","connect", "Created onTrigger slot",target_slot);
            }else{
                return null; // -- break --
            }
            
        }else{
            target_slot = target_node.getInputSlot(target_slot);
        }

        // you can specify the slot by name
        /* if (target_slot.constructor === String) {
            target_slot = target_node.findInputSlot(target_slot);
            if (target_slot == -1) {
                LiteGraph.log_warn("lgraphnode","connect", "Target string slot not found",target_slot);
                return null;
            }
        } else */
        
        if (
            !target_node.inputs || target_slot == -1
            // target_slot >= target_node.inputs.length
        ) {
            LiteGraph.log_warn("lgraphnode","connect", "Target slot not found",target_slot,target_node.inputs);
            return null;
        }

        var changed = false;

        var input = target_node.inputs[target_slot];
        var link_info = null;
        var output = this.outputs[slot];

        if (!this.outputs[slot]) {
            LiteGraph.log_warn("lgraphnode","connect", "Invalid processed output slot: ",slot,this.outputs);
            return null;
        }

        // callback ,allow the node to change target slot
        r = target_node.processCallbackHandlers("onBeforeConnectInput",{
            def_cb: target_node.onBeforeConnectInput
        }, target_node);
        if(r!==null && (typeof(r)=="object" && r.return_value!==null)){
            LiteGraph.log_debug("lgraphnode","connect", "Node onBeforeConnectInput changing target_slot",target_slot,r.return_value);
            target_slot = r.return_value;
        }

        // callback, allow the node to stop connection
        r = this.processCallbackHandlers("onConnectOutput",{
            def_cb: this.onConnectOutput
        }, slot, input.type, input, target_node, target_slot);
        if(r!==null && (r===false || (typeof(r)=="object" && r.return_value===false))){
            LiteGraph.log_debug("lgraphnode","connect", "Node onConnectOutput stopping connection",r.return_value);
            return null;
        }

        // check target_slot and check connection types
        if (target_slot===false || target_slot===null || !LiteGraph.isValidConnection(output.type, input.type)) {
            LiteGraph.log_warn("lgraphnode", "connect", "target_slot is NOT valid",target_slot,output.type,input.type);
            this.setDirtyCanvas(false, true);
            if(changed)
                this.graph.connectionChange(this, link_info);
            return null;
        } else {
            LiteGraph.log_debug("lgraphnode", "connect", "target_slot is valid",target_slot);
        }

        // callback, allow the target node to stop connection
        r = target_node.processCallbackHandlers("onConnectInput",{
            def_cb: target_node.onConnectInput
        }, target_slot, output.type, output, this, slot);
        if(r!==null && (r===false || (typeof(r)=="object" && r.return_value===false))){
            LiteGraph.log_debug("lgraphnode","connect", "targetNode onConnectInput stopping connection",r.return_value);
            return null;
        }
        // check :: was already called just few steps here above
        // if ( this.onConnectOutput?.(slot, input.type, input, target_node, target_slot) === false ) {
        //     return null;
        // }

        // if there is something already plugged there, disconnect
        if (target_node.inputs[target_slot] && target_node.inputs[target_slot].link != null) {
            this.graph.beforeChange();
            target_node.disconnectInput(target_slot, {doProcessChange: false});
            changed = true;
        }
        if (output.links?.length) {
            switch(output.type) {
                case LiteGraph.EVENT:
                    if (!LiteGraph.allow_multi_output_for_events) {
                        this.graph.beforeChange();
                        this.disconnectOutput(slot, false, {doProcessChange: false}); // Input(target_slot, {doProcessChange: false});
                        changed = true;
                    }
                    break;
                default:
                    break;
            }
        }

        var nextId
        if (LiteGraph.use_uuids)
            nextId = LiteGraph.uuidv4();
        else
            nextId = ++this.graph.last_link_id;

        // create link class
        link_info = new LiteGraph.LLink(
            nextId,
            input.type || output.type,
            this.id,
            slot,
            target_node.id,
            target_slot,
        );

        // add to graph links list
        this.graph.links[link_info.id] = link_info;

        // connect in output
        if (output.links == null) {
            output.links = [];
        }
        output.links.push(link_info.id);
        // connect in input
        if(typeof target_node.inputs[target_slot] == "undefined") {
            LiteGraph.log_warn("lgraphnode", "connect", "FIXME error, target_slot does not exists on target_node",target_node,target_slot);
        }
        target_node.inputs[target_slot].link = link_info.id;

        this.processCallbackHandlers("onConnectionsChange",{
            def_cb: this.onConnectionsChange
        }, LiteGraph.OUTPUT, slot, true, link_info, output,);

        target_node.processCallbackHandlers("onConnectionsChange",{
            def_cb: target_node.onConnectionsChange
        }, LiteGraph.INPUT, target_slot, true, link_info, input,);

        if (this.graph) {

            this.graph.processCallbackHandlers("onNodeConnectionChange",{
                def_cb: this.graph.onNodeConnectionChange
            }, LiteGraph.INPUT, target_node, target_slot, this, slot,);
    
            this.graph.processCallbackHandlers("onNodeConnectionChange",{
                def_cb: this.graph.onNodeConnectionChange
            }, LiteGraph.OUTPUT, this, slot, target_node, target_slot,);

        }

        this.graph.onGraphChanged({action: "connect"});
        this.setDirtyCanvas(false, true);
        this.graph.afterChange();
        this.graph.connectionChange(this, link_info);

        return link_info;
    }

    /**
     * disconnect one output to an specific node
     * @method disconnectOutput
     * @param {number|string} slot (could be the number of the slot or the string with the name of the slot)
     * @param {LGraphNode} target_node the target node to which this slot is connected [Optional, if not target_node is specified all nodes will be disconnected]
     * @return {boolean} if it was disconnected successfully
     */
    disconnectOutput(slot, target_node, optsIn = {}) {
        var optsDef = { doProcessChange: true };
        var opts = Object.assign(optsDef,optsIn);

        /* if (slot.constructor === String) {
            slot = this.findOutputSlot(slot);
            if (slot == -1) {
                LiteGraph.log_warn("lgraphnode","disconnectOutput","Error, string slot not found",slot);
                return false;
            }
        } else if (!this.outputs || slot >= this.outputs.length) {
            LiteGraph.log_warn("lgraphnode","disconnectOutput","Error, number slot not found",slot);
            return false;
        } */
        slot = this.getOutputSlot(slot);

        // get output slot
        var output = this.outputs[slot];
        if (!output || !output.links || output.links.length == 0) {
            LiteGraph.log_warn("lgraphnode","disconnectOutput","Error, invalid slot or not linked",slot,output);
            return false;
        }

        // one of the output links in this slot
        if (target_node) {
            if (target_node.constructor === Number) { // check this ? Number constructor falling back to ID ?
                LiteGraph.log_debug("lgraphnode","disconnectOutput", "Target node constructor is number",target_node);
                target_node = this.graph.getNodeById(target_node);
                LiteGraph.log_debug("lgraphnode","disconnectOutput", "Target node number constructor, looked for node by ID",target_node);
            }
            if (!target_node) {
                LiteGraph.log_warn("lgraphnode","disconnectOutput","target node not found",target_node);
                return false;
            }

            for (let i = 0, l = output.links.length; i < l; i++) {
                let link_id = output.links[i];
                let link_info = this.graph.links[link_id];

                // is the link we are searching for...
                if (link_info.target_id == target_node.id) {
                    output.links.splice(i, 1); // remove here
                    var input = target_node.inputs[link_info.target_slot];
                    input.link = null; // remove there
                    delete this.graph.links[link_id]; // remove the link from the links pool
                    this.graph?.onGraphChanged({action: "disconnectOutput", doSave: opts.doProcessChange});
                    
                    // link_info hasn't been modified so its ok
                    
                    target_node.processCallbackHandlers("onConnectionsChange",{
                        def_cb: target_node.onConnectionsChange
                    }, LiteGraph.INPUT, link_info.target_slot, false, link_info, input,);

                    this.processCallbackHandlers("onConnectionsChange",{
                        def_cb: this.onConnectionsChange
                    }, LiteGraph.OUTPUT, slot, false, link_info, output,);
                    
                    if (this.graph) {
                
                        this.graph.processCallbackHandlers("onNodeConnectionChange",{
                            def_cb: this.graph.onNodeConnectionChange
                        }, LiteGraph.OUTPUT, this, slot, target_node, link_info.target_slot,);

                        this.graph.processCallbackHandlers("onNodeConnectionChange",{
                            def_cb: this.graph.onNodeConnectionChange
                        }, LiteGraph.INPUT, target_node, link_info.target_slot, this, slot,);

                    }
                    break;
                }
            }
        } else { // all the links in this output slot
            for (let i = 0, l = output.links.length; i < l; i++) {
                let link_id = output.links[i];
                let link_info = this.graph.links[link_id];
                if (!link_info) {
                    // bug: it happens sometimes
                    LiteGraph.log_warn("lgraphnode", "disconnectOutput", "A link is invalid", link_id, this, output);
                    continue;
                }

                target_node = this.graph.getNodeById(link_info.target_id);
                input = null;
                this.graph?.onGraphChanged({action: "disconnectOutput", doSave: opts.doProcessChange});
                if (target_node) {
                    input = target_node.inputs[link_info.target_slot];
                    input.link = null; // remove other side link
                    
                    target_node.processCallbackHandlers("onConnectionsChange",{
                        def_cb: target_node.onConnectionsChange
                    }, LiteGraph.INPUT, link_info.target_slot, false, link_info, input,);

                    this.graph.processCallbackHandlers("onNodeConnectionChange",{
                        def_cb: this.graph.onNodeConnectionChange
                    }, LiteGraph.INPUT, target_node, link_info.target_slot, this, );
                    
                }

                delete this.graph.links[link_id]; // remove the link from the links pool

                this.processCallbackHandlers("onConnectionsChange",{
                    def_cb: this.onConnectionsChange
                }, LiteGraph.OUTPUT, slot, false, link_info, output,);
                
                this.graph.processCallbackHandlers("onNodeConnectionChange",{
                    def_cb: this.graph.onNodeConnectionChange
                }, LiteGraph.OUTPUT, this, slot, target_node, link_info.target_slot,);

            }
            output.links = null;
        }

        this.setDirtyCanvas(false, true);
        this.graph.connectionChange(this);
        return true;
    }

    /**
     * disconnect one input
     * @method disconnectInput
     * @param {number|string} slot (could be the number of the slot or the string with the name of the slot)
     * @return {boolean} if it was disconnected successfully
     */
    disconnectInput(slot, optsIn = {}) {
        var optsDef = { doProcessChange: true };
        var opts = Object.assign(optsDef,optsIn);

        // seek for the output slot
        /* if (slot.constructor === String) {
            slot = this.findInputSlot(slot);
            if (slot == -1) {
                LiteGraph.log_warn("lgraphnode", "disconnectInput", "Error, string slot not found",slot);
                return false;
            }
        } else if (!this.inputs || slot >= this.inputs.length) {
            LiteGraph.log_warn("lgraphnode", "disconnectInput", "Error, number slot not found",slot);
            return false;
        } */
        slot = this.getInputSlot(slot);

        var input = this.inputs[slot];
        if (!input) {
            return false;
        }

        var link_id = this.inputs[slot].link;
        if(link_id != null) {
            this.inputs[slot].link = null;

            // remove other side
            var link_info = this.graph.links[link_id];
            if (link_info) {
                var target_node = this.graph.getNodeById(link_info.origin_id);
                if (!target_node) {
                    return false;
                }

                var output = target_node.outputs[link_info.origin_slot];
                if (!output || !output.links || output.links.length == 0) {
                    return false;
                }

                // search in the inputs list for this link
                for (var i = 0, l = output.links.length; i < l; i++) {
                    if (output.links[i] == link_id) {
                        output.links.splice(i, 1);
                        break;
                    }
                }

                delete this.graph.links[link_id]; // remove from the pool
                this.graph?.onGraphChanged({action: "disconnectInput", doSave: opts.doProcessChange});

                this.processCallbackHandlers("onConnectionsChange",{
                    def_cb: this.onConnectionsChange
                }, LiteGraph.INPUT, slot, false, link_info, input,);

                target_node.processCallbackHandlers("onConnectionsChange",{
                    def_cb: target_node.onConnectionsChange
                }, LiteGraph.OUTPUT, i, false, link_info, output,);

                if (this.graph) {
                    this.graph.processCallbackHandlers("onNodeConnectionChange",{
                        def_cb: this.graph.onNodeConnectionChange
                    }, LiteGraph.OUTPUT, target_node, i,);
                    this.graph.processCallbackHandlers("onNodeConnectionChange",{
                        def_cb: this.graph.onNodeConnectionChange
                    }, LiteGraph.INPUT, this, slot,);
                }
            }
        } // link != null

        this.setDirtyCanvas(false, true);
        if(this.graph)
            this.graph.connectionChange(this);
        return true;
    }

    /**
     * Returns the center of a connection point in canvas coordinates
     * @method getConnectionPos
     * @param {boolean} is_input - True if it is an input slot, false if it is an output slot
     * @param {number | string} slot - Could be the number of the slot or the string with the name of the slot
     * @param {vec2} [out] - [Optional] A place to store the output to reduce garbage
     * @return {Float32[]} The position as [x, y]
     */
    getConnectionPos(is_input, slot_number, out = new Float32Array(2)) {
        var num_slots = 0;
        if (is_input && this.inputs) {
            num_slots = this.inputs.length;
        }
        if (!is_input && this.outputs) {
            num_slots = this.outputs.length;
        }

        var offset = LiteGraph.NODE_SLOT_HEIGHT * 0.5;

        if (this.flags.collapsed) {
            var w = this._collapsed_width || LiteGraph.NODE_COLLAPSED_WIDTH;
            if (this.horizontal) {
                out[0] = this.pos[0] + w * 0.5;
                if (is_input) {
                    out[1] = this.pos[1] - LiteGraph.NODE_TITLE_HEIGHT;
                } else {
                    out[1] = this.pos[1];
                }
            } else {
                if (is_input) {
                    out[0] = this.pos[0];
                } else {
                    out[0] = this.pos[0] + w;
                }
                out[1] = this.pos[1] - LiteGraph.NODE_TITLE_HEIGHT * 0.5;
            }
            return out;
        }

        // weird feature that never got finished
        if (is_input && slot_number == -1) {
            LiteGraph.log_debug("lgraphnode", "getConnectionPos", "asking for connection slot -1");
            out[0] = this.pos[0] + LiteGraph.NODE_TITLE_HEIGHT * 0.5;
            out[1] = this.pos[1] + LiteGraph.NODE_TITLE_HEIGHT * 0.5;
            return out;
        }

        // hard-coded pos
        if (
            is_input &&
            num_slots > slot_number &&
            this.inputs[slot_number].pos
        ) {
            out[0] = this.pos[0] + this.inputs[slot_number].pos[0];
            out[1] = this.pos[1] + this.inputs[slot_number].pos[1];
            return out;
        } else if (
            !is_input &&
            num_slots > slot_number &&
            this.outputs[slot_number].pos
        ) {
            out[0] = this.pos[0] + this.outputs[slot_number].pos[0];
            out[1] = this.pos[1] + this.outputs[slot_number].pos[1];
            return out;
        }

        // horizontal distributed slots
        if (this.horizontal) {
            out[0] =
                this.pos[0] + (slot_number + 0.5) * (this.size[0] / num_slots);
            if (is_input) {
                out[1] = this.pos[1] - LiteGraph.NODE_TITLE_HEIGHT;
            } else {
                out[1] = this.pos[1] + this.size[1];
            }
            return out;
        }

        // default vertical slots
        if (is_input) {
            out[0] = this.pos[0] + offset;
        } else {
            out[0] = this.pos[0] + this.size[0] + 1 - offset;
        }
        out[1] =
            this.pos[1] +
            (slot_number + 0.7) * LiteGraph.NODE_SLOT_HEIGHT +
            (this.constructor.slot_start_y || 0);
        return out;
    }

    /* Force align to grid */
    alignToGrid() {
        this.pos[0] =
            LiteGraph.CANVAS_GRID_SIZE *
            Math.round(this.pos[0] / LiteGraph.CANVAS_GRID_SIZE);
        this.pos[1] =
            LiteGraph.CANVAS_GRID_SIZE *
            Math.round(this.pos[1] / LiteGraph.CANVAS_GRID_SIZE);
    }

    /* Console output */
    trace(msg) {
        if (!this.console) {
            this.console = [];
        }

        this.console.push?.(msg);
        if (this.console.length > LGraphNode.MAX_CONSOLE) {
            this.console.shift?.();
        }

        this.graph.processCallbackHandlers("onNodeTrace",{
            def_cb: this.graph.onNodeTrace
        }, this, msg);
    }

    /* Forces to redraw or the main canvas (LGraphNode) or the bg canvas (links) */
    setDirtyCanvas(dirty_foreground, dirty_background) {
        if (!this.graph) {
            return;
        }
        this.graph.sendActionToCanvas("setDirty", [
            dirty_foreground,
            dirty_background,
        ]);
    }

    loadImage(url) {
        var img = new Image();
        img.src = LiteGraph.node_images_path + url;
        img.ready = false;

        var that = this;
        img.onload = function() {
            this.ready = true;
            that.setDirtyCanvas(true);
        };
        return img;
    }

    // safe LGraphNode action execution (not sure if safe)
    /*
    LGraphNode.prototype.executeAction = function(action)
    {
    if(action == "") return false;

    if( action.indexOf(";") != -1 || action.indexOf("}") != -1)
    {
        this.trace("Error: Action contains unsafe characters");
        return false;
    }

    var tokens = action.split("(");
    var func_name = tokens[0];
    if( typeof(this[func_name]) != "function")
    {
        this.trace("Error: Action not found on node: " + func_name);
        return false;
    }

    var code = action;

    try
    {
        var _foo = eval;
        eval = null;
        (new Function("with(this) { " + code + "}")).call(this);
        eval = _foo;
    }
    catch (err)
    {
        this.trace("Error executing action {" + action + "} :" + err);
        return false;
    }

    return true;
    }
    */

    /* Allows to get onMouseMove and onMouseUp events even if the mouse is out of focus */
    captureInput(v) {
        if (!this.graph || !this.graph.list_of_graphcanvas) {
            return;
        }

        var list = this.graph.list_of_graphcanvas;

        for (var i = 0; i < list.length; ++i) {
            var c = list[i];
            // releasing somebody elses capture?!
            if (!v && c.node_capturing_input != this) {
                continue;
            }

            // change
            c.node_capturing_input = v ? this : null;
        }
    }

    /**
     * Collapse the node to make it smaller on the canvas
     * @method collapse
     **/
    collapse(force) {
        this.graph.onGraphChanged({action: "collapse"});
        if (this.constructor.collapsable === false && !force) {
            return;
        }
        if (!this.flags.collapsed) {
            this.flags.collapsed = true;
        } else {
            this.flags.collapsed = false;
        }
        this.setDirtyCanvas(true, true);
    }

    /**
     * Forces the node to do not move or realign on Z
     * @method pin
     **/

    pin(v) {
        this.graph.onGraphChanged({action: "pin"});
        if (v === undefined) {
            this.flags.pinned = !this.flags.pinned;
        } else {
            this.flags.pinned = v;
        }
    }

    localToScreen(x, y, graphcanvas) {
        return [
            (x + this.pos[0]) * graphcanvas.scale + graphcanvas.offset[0],
            (y + this.pos[1]) * graphcanvas.scale + graphcanvas.offset[1],
        ];
    }

    refreshAncestors(optsIn = {}) {
        var optsDef = {
            action: "",
            param: null,
            options: null,
            passParam: true,
        };
        var opts = Object.assign(optsDef,optsIn);

        if (!this.inputs) {
            return;
        }
        if (LiteGraph.preventAncestorRecalculation) {
            if (this.graph.node_ancestorsCalculated && this.graph.node_ancestorsCalculated[this.id]) {
                LiteGraph.log_verbose("lgraphnode", "refreshAncestors", "already calculated subtree! Prevent! "+this.id+":"+this.order);
                return;
            }
        }

        if (!opts.action || opts.action == "")
            opts.action = this.id+"_ancestors";
        if (!opts.param || opts.param == "")
            opts.param = this.id+"_ancestors";
        if (!opts.options)
            opts.options = {};
        opts.options = Object.assign({action_call: opts.action},opts.options);

        LiteGraph.log_verbose("lgraphnode", "refreshAncestors", "ancestors processing", this.id+":"+this.order+" "+opts.options.action_call);

        this.graph.ancestorsCall = true; // prevent triggering slots

        var optsAncestors = {
            modesSkip: [LiteGraph.NEVER, LiteGraph.ON_EVENT, LiteGraph.ON_TRIGGER],
            modesOnly: [LiteGraph.ALWAYS, LiteGraph.ON_REQUEST],
            typesSkip: [LiteGraph.ACTION],
            typesOnly: [],
        };
        var aAncestors = this.graph.getAncestors(this,optsAncestors);
        for(var iN in aAncestors) {
            aAncestors[iN].doExecute(opts.param, opts.options);
            this.graph.node_ancestorsCalculated[aAncestors[iN].id] = true;
        }

        this.graph.ancestorsCall = false; // restore triggering slots
        this.graph.node_ancestorsCalculated[this.id] = true;

        return true;
    }
}

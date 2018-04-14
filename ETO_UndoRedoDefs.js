// Author:
// Evan Thomas Olds
//
// Creation Date:
// February 28, 2017
//
// File Dependencies:
// ETO_Foundation.js
// ETO_Observable.js
//
// Technology Dependencies:
// ES 5.1 or later
//
// Declared classes (constructor functions) in this file:
// ETO_UndoRedoSystem

// ----------------------------------------------------------

// ETO_UndoRedoSystem()
//
// Constructor function for undo/redo system. Inherits from ETO_Observable and provides 
// notifications when any of the following properties change:
// - undoText
// - redoText
// - undoCount
// - redoCount
function ETO_UndoRedoSystem()
{
    // First call the "parent class" constructor
    ETO_Observable.call(this);
    
    // Initialize the stacks for undos and redos
    this.addProperty("m_undos", new Array(), false, false, false);
    this.addProperty("m_redos", new Array(), false, false, false);
    
    // Add "undoText" and "redoText" properties
    this.addProperty("undoText", "Undo", false, true, true);
    this.addProperty("redoText", "Redo", false, true, true);

    // Get a reference to 'this' for function closures
    var us = this;

    // Add the undoCount property, which is equal to the length of m_undos
    Object.defineProperty(this, "undoCount", {
    	"enumerable": true,
    	"configurable": false,
    	"get": function() { return us.m_undos.length; }
    });

    // Add the redoCount property, which is equal to the length of m_redos
    Object.defineProperty(this, "redoCount", {
    	"enumerable": true,
    	"configurable": false,
    	"get": function() { return us.m_redos.length; }
    });
}

// Inherit from ETO_Observable
ETO_UndoRedoSystem.prototype = Object.create(ETO_Observable.prototype);

// addUndo(text, commandObject)
// addUndo(text, arrayOfCommandObjects)
//
// Adds undos to the top of the undo stack. Each undo object must be a command object 
// with an exec() function. See the implementation of ETO_SetPropertyCmd in this file 
// for an example command object implementation.
ETO_UndoRedoSystem.prototype.addUndo = function(text, cmdOrArrOfCmds)
{
    // If the second parmeter is an array, we package it up into an ETO_InvertibleCmds object
    if (cmdOrArrOfCmds instanceof Array)
    {
        cmdOrArrOfCmds = new ETO_InvertibleCmds(cmdOrArrOfCmds);
    }
    
    // Push onto the undo stack
    this.m_undos.push([text, cmdOrArrOfCmds]);
    
    // Since we inherit from ETO_Observable, changing undoText will notify observers 
    // appropriately.
    this.undoText = text;
    
    // Adding a new undo clears the redo stack
    var previousRedoCount = this.redoCount;
    this.m_redos.splice(0);
    this.redoText = "Redo";

    // Notify observers that undoCount has increased by 1
    this.notifyAll({
		"name": "undoCount",
		"oldValue": this.m_undos.length - 1,
		"object": this
	});

    // If the redoCount property changed, notify observers
    if (previousRedoCount != 0)
    {
    	this.notifyAll({
    		"name": "redoCount",
    		"oldValue": previousRedoCount,
    		"object": this
    	});
    }
    
    return true;
}

// clear()
//
// Clears the undo and redo stacks
ETO_UndoRedoSystem.prototype.clear = function()
{
	var previousUndoCount = this.undoCount;
	var previousRedoCount = this.redoCount;

    this.m_undos.splice(0);
    this.m_redos.splice(0);
    this.undoText = "Undo";
    this.redoText = "Redo";

    // undoCount is reset to 0, since the array was cleared. If the previous value 
    // was not 0, then observers must be notified.
    if (previousUndoCount != 0)
    {
    	this.notifyAll({
    		"name": "undoCount",
    		"oldValue": previousUndoCount,
    		"object": this
    	});
    }

    // redoCount is reset to 0, since the array was cleared. If the previous value 
    // was not 0, then observers must be notified.
    if (previousRedoCount != 0)
    {
    	this.notifyAll({
    		"name": "redoCount",
    		"oldValue": previousRedoCount,
    		"object": this
    	});
    }
}

// execRedo()
//
// Executes the redo at the top of the undo stack and pushes an appropriate undo onto the undo
// stack. Does nothing if the redo stack is empty.
ETO_UndoRedoSystem.prototype.execRedo = function()
{
	if (this.m_redos.length === 0) { return; }
    
    // Each item on the stack is a [text,cmd] tuple
    var redoPair = this.m_redos.pop();
    
    // Execute the command and store the returned undo
    var undo = redoPair[1].exec();
    
    // Make the undo text string and add the undo
    var undoText = redoPair[0].replace("Redo", "Undo");
    this.m_undos.push([undoText, undo]);
    this.undoText = undoText;

    // Notify observers that undoCount has increased by 1
    this.notifyAll({
		"name": "undoCount",
		"oldValue": this.m_undos.length - 1,
		"object": this
	});
    
    // Update the redo text
    if (this.m_redos.length === 0)
        this.redoText = "Redo";
    else
        this.redoText = this.m_redos[this.m_redos.length - 1][0];

    // Notify that the redo count has decreased by 1
    this.notifyAll({
		"name": "redoCount",
		"oldValue": this.m_redos.length + 1,
		"object": this
	});
}

// execUndo()
//
// Executes the undo at the top of the undo stack and pushes an appropriate redo onto the redo
// stack. Does nothing if the undo stack is empty.
ETO_UndoRedoSystem.prototype.execUndo = function()
{
    if (this.m_undos.length === 0) { return; }
    
    // Each item on the stack is a [text,cmd] tuple
    var undoPair = this.m_undos.pop();
    
    // Execute the command and store the returned redo
    var redo = undoPair[1].exec();
    
    // Make the redo text string and add the redo
    var redoText = undoPair[0].replace("Undo", "Redo");
    this.m_redos.push([redoText, redo]);
    this.redoText = redoText;

    // Notify that the redo count has increased by 1
    this.notifyAll({
		"name": "redoCount",
		"oldValue": this.m_redos.length - 1,
		"object": this
	});
    
    // Update the undo text
    if (this.m_undos.length === 0)
        this.undoText = "Undo";
    else
        this.undoText = this.m_undos[this.m_undos.length - 1][0];

    // Notify observers that undoCount has decreased by 1
    this.notifyAll({
		"name": "undoCount",
		"oldValue": this.m_undos.length + 1,
		"object": this
	});
}

// execWithUndo(undoText, cmd)
//
// Executes an invertible command object and creates an undo for it.
ETO_UndoRedoSystem.prototype.execWithUndo = function(undoText, cmd)
{
    // First execute the command
    var undoCmd = cmd.exec();
    
    // If return value is non-null, add the undo
    if (undoCmd != null)
    {
        this.addUndo(undoText, [undoCmd]);
        return true;
    }
    return false;
}

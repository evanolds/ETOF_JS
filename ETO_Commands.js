// Author:
//   Evan Thomas Olds
//
// History:
//   April 16, 2018
//   Original file creation (but much of the content was migrated over from 
//   already written code from other files)
//
// File Dependencies:
//   (none)
//
// Technology Dependencies:
//   ES 5.1 or later
//
// Declared classes (constructor functions) in this file:
//   ETO_InvertibleCmd
//   ETO_InvertibleCmds
//   ETO_SetPropertyCmd
//   ETO_ArrayInsertCmd
//   ETO_ArrayRemoveCmd
//
// Description:
//   This file contains definitions of constructor functions for invertible command objects.
//   Each command object has an 'exec' function.
//   ETO_InvertibleCmd is the base class for all command classes.

// ----------------------------------------------------------

// ETO_InvertibleCmd is a constructor function for an invertible command object. It is meant to serve only
// as an abstract base class and has no default functionality. All inheriting classes must implement the
// 'exec()' function.
function ETO_InvertibleCmd() { }

ETO_InvertibleCmd.prototype.exec = function()
{
    throw new Error(
        "ETO_InvertibleCmd is an abstract base class and throws error when " +
        "the 'exec' function has not been properly overridden by the inheriting class.");
}

// ----------------------------------------------------------

// Constructor function for an invertible command that represents a collection of invertible commands.
function ETO_InvertibleCmds(cmdArr)
{
    this.exec = function()
    {
        var inverseArr = new Array(cmdArr.length);
        for (var i = 0; i < cmdArr.length; i++)
        {
            inverseArr[cmdArr.length - i - 1] = cmdArr[i].exec();
        }
        return new ETO_InvertibleCmds(inverseArr);
    };
    Object.freeze(this);
}

// Inherit from ETO_InvertibleCmd
ETO_InvertibleCmds.prototype = Object.create(ETO_InvertibleCmd.prototype);

// ----------------------------------------------------------

// Constructor function for an invertible command that sets a property on an object to a value.
function ETO_SetPropertyCmd(object, propertyName, value)
{
    this.exec = function()
    {
        // Make the inverse action that sets back to what it is now
        var inverse = new ETO_SetPropertyCmd(object, propertyName, object[propertyName]);
        
        // Set the property
        object[propertyName] = value;
        
        // Return inverse
        return inverse;
    };
    Object.freeze(this);
}

// Inherit from ETO_InvertibleCmd
ETO_SetPropertyCmd.prototype = Object.create(ETO_InvertibleCmd.prototype);

// ----------------------------------------------------------

// Constructor function for a command object that inserts a
// single item into an array at the specified index.
function ETO_ArrayInsertCmd(array, item, insertionIndex)
{
    this.exec = function()
    {
        // Insert the item, then return the inverse command
        array.splice(insertionIndex, 0, item);
        return new ETO_ArrayRemoveCmd(array, insertionIndex);
    };
    Object.freeze(this);
}

// Inherit from ETO_InvertibleCmd
ETO_ArrayInsertCmd.prototype = Object.create(ETO_InvertibleCmd.prototype);

// ----------------------------------------------------------

function ETO_ArrayRemoveCmd(array, index)
{
    this.exec = function()
    {
        // Get the item before removing
        var item = array[index];

        // Remove the item
        array.splice(index, 1);

        // Return the inverse command
        return new ETO_ArrayInsertCmd(array, item, index);
    };
    Object.freeze(this);
}

// Inherit from ETO_InvertibleCmd
ETO_ArrayRemoveCmd.prototype = Object.create(ETO_InvertibleCmd.prototype);

// ----------------------------------------------------------

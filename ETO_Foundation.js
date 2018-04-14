// Author:
// Evan Thomas Olds
//
// Creation Date:
// January 26, 2017
// (some classes, originally created November 28, 2016, migrated to this file)
//
// Implementation references:
// https://developer.mozilla.org/
//
// File Dependencies:
// (none)
//
// Technology Dependencies:
// ES 5.1 or later
//
// Declared global functions in this file:
// ETO_StringCount
// ETO_StringIsWhitespace
// ETO_StringFromRepeat
// ETO_StringReplaceAll
//
// Declared classes (constructor functions) in this file:
// ETO_Result
// ETO_InvertibleCmd
// ETO_InvertibleCmds
// ETO_SetPropertyCmd
// ETO_TextSelection

// ----------------------------------------------------------

// ETO_Result(success, message)
//
// Constructor function for a result object with read-only members "success" and "message". 
// An optional "op" member is a string to provide the operation name. Suggested form of this 
// string is "className.functionName", although this is not required.
// More members can (and probably should) be added, if needed.
function ETO_Result(success, message, operationName)
{
    // Add "success" member, making sure it's a bool
    if (success)
        success = true;
    else
        success = false;
    Object.defineProperty(this, "success", {"enumerable": true, "value": success});

    // Add "message" member
    Object.defineProperty(this, "message", {"enumerable": true, "value": message});

    // If the "operationName" argument was provided, then add "op" member
    if (typeof operationName != "undefined")
        Object.defineProperty(this, "op", {"enumerable": true, "value": operationName});
}

// ----------------------------------------------------------

// ETO_InvertibleCmd is a constructor function for an invertible command object. It is meant to serve only
// as an abstract base class and has no default functionality. All inheriting classes must implement the
// 'exec()' function.
function ETO_InvertibleCmd() { }

ETO_InvertibleCmd.prototype.exec = function()
{
    throw new Error(
        "ETO_InvertibleCmd is an abstract base class and logs throws error when " +
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

// Constructor function for an immutable object representing a single selected range within
// a text string. Internally this is stored as a reference to the text string, a starting
// character index, and a length, in characters. The length can be any integer, including 0
// or negative values. 
// If the starting index is outside of the range [0, text.length - 1], then it will be 
// clamped to this range, regardless of the length value.
// After clamping the start index, if the start index + length goes beyond the bounds of 
// the text string then the length value will be clamped.
function ETO_TextSelection(text, startIndex, length)
{
    this.text = text;
	
	// Clamp starting index if need be
	if (startIndex < 0) { this.startIndex = 0; }
	else if (startIndex >= text.length) { this.startIndex = text.length - 1; }
    else { this.startIndex = startIndex; }
    
	// Clamp length if need be
	if (this.startIndex + length >= text.length)
	{
		this.length = text.length - this.startIndex;
	}
	else if (this.startIndex + length < 0)
	{
		this.length = -this.startIndex;
	}
	else { this.length = length; }
    
	// Make immutable
	Object.freeze(this);
}

// Returns an array of indices for lines that are completely contained within the selection. 
// Uses '\n' as the line break string.
ETO_TextSelection.prototype.getFullySelectedLineIndices = function()
{
	if (this.length === 0) { return []; }
	
	// Compute inclusive start index and exclusive end index
	var start, end;
	if (this.length > 0)
	{
		start = this.startIndex;
		end = start + this.length;
	}
	else
	{
		start = this.startIndex + this.length;
		end = this.startIndex;
	}
	
	var lineStart = 0;
	var lineIndex = 0;
	var go = true;
	var result = [];
	while (go && lineStart < this.text.length)
	{
		var lineEnd = this.text.indexOf('\n', lineStart + 1);
		if (lineEnd == -1)
		{
			lineEnd = this.text.length;
			go = false;
		}
		
		// If the whole line is within the selected range, then add 
		// the line index
		if (lineStart >= start && lineEnd <= end)
		{
			result.push(lineIndex);
		}
		
		// Go to next line for next loop iteration
		lineStart = lineEnd + 1;
		lineIndex++;
	}
    return result;
}

// Gets the 0-based line index of the line where the selection starts. Uses '\n' as the
// line break string.
ETO_TextSelection.prototype.getStartLineIndex = function()
{
    var lineIndex = 0;
    
    // Count the number of line break characters before the selection starting index
    for (var i = 0; i < this.startIndex; i++)
    {
        if (this.text[i] == "\n")
        {
            lineIndex++;
        }
    }
    
    return lineIndex;
}

// Gets the 0-based character index of the where the selection starts, relative to the line
// that the selection is on. Example:
// If the text is "AAA\nBB\C" and the selection start is 5, meaning the selection starts
// before the second 'B' on the second line, then this function would return 1.
// Uses '\n' as the line break string.
ETO_TextSelection.prototype.getStartLineCharIndex = function()
{
    var index = 0;
    
    for (var i = 0; i < this.startIndex; i++)
    {
        // Reset the index to 0 each time we pass a line break
        if (this.text[i] == "\n")
            index = 0;
        else
            index++;
    }
    
    return index;
}

ETO_TextSelection.prototype.getSelectedText = function()
{
	if (this.length === 0) { return ""; }
	else if (this.length > 0)
	{
		return this.text.substr(this.startIndex, this.length);
	}
	
    // Negative length means the starting index is really at start+length
    var len = Math.abs(this.length);
	return this.text.substr(this.startIndex+this.length, len);
}

// Finds the last line that has one or more character within the selection range 
// and returns a text string for this line. If the 'fullText' parameter is true, 
// then the full text of this line, including any portions outside of this 
// selection, is returned. If 'fullText' is false, undefined, or any other 
// non-true value, then only the selected text on the last line is returned. 
// Uses '\n' as the line break string.
ETO_TextSelection.prototype.getTextOfLastLine = function(fullText)
{	
	// Start by getting the selected text
	var selText = this.getSelectedText();
	
	// First special case is empty string
	if (selText.length == 0) { return ""; }
	
	// Next special case if the selected text ends with '\n'
	if (selText[selText.length - 1] == "\n")
	{
		// Chop off the last '\n' and fall through
		selText = selText.substr(0, selText.length - 1);
	}
	
	// Find the last line break and return what's after it
	var lastBreakIndex = selText.lastIndexOf("\n");
	return selText.substr(lastBreakIndex + 1);
}

ETO_TextSelection.prototype.getTextWithSelectionRemoved = function()
{
	// If there is no selection (selection length 0), then return whole text
	if (this.length === 0) { return this.text; }
	
	var start, len;
	if (this.length < 0)
	{
		// Negative length means the starting index is really at start+length
		len = Math.abs(this.length);
		start = this.startIndex + this.length;
	}
	else
	{
		start = this.startIndex;
		len = this.length;
	}
	
	// The string substr function allows length 0, so we don't need special 
	// cases and instead can just take text before and after selection.
	return this.text.substr(0, start) + this.text.substr(start + len);
}

// ----------------------------------------------------------

// String utility functions follow

// ETO_StringCount(str, substr)
// Counts the number of non-overlapping occurrences of substr within str
function ETO_StringCount(str, substr)
{
    var count = 0;
    var index = str.indexOf(substr);
    while (index !== -1)
    {
    	count++;
    	index = str.indexOf(substr, index + substr.length);
    }
    return count;
}

function ETO_StringIsWhitespace(str)
{
    for (var i = 0; i < str.length; i++)
    {
        var theChar = str.charAt(i);
        if (theChar != " " && theChar != "\t")
            return false;
    }
    return true;
}

function ETO_StringFromRepeat(str, repeatCount)
{
    var result = str;
    for (var i = 1; i < repeatCount; i++)
    {
        result += str;
    }
    return result;
}

function ETO_StringReplaceAll(str, replaceMe, withMe)
{
	// Should probably implement a more efficient version later
    while (str.indexOf(replaceMe) !== -1)
    {
    	str = str.replace(replaceMe, withMe);
    }
    return str;
}

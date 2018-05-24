// Author:
//   Evan Thomas Olds
//
// References:
//   https://developer.mozilla.org/
//
// File Dependencies:
//   (none)
//
// Technology Dependencies:
//   ES 5.1 or later
//
// Declared classes (constructor functions) in this file:
//   ETO_Observable
//   ETO_ObservableList

// ----------------------------------------------------------

// ETO_Observable(objectToCopy, simpleSerialize)
//
// Constructor function for an observable object. This is an object that can have observable properties 
// added. When such properties are changed, change observers are notified.
//
// Function parameters:
//
// "objectToCopy":
//   Object to copy to construct this instance. Ignored if not a non-null object.
//   One special case is when this object has the 'ETO_Observable_SerializedData' member, 
//   which indicates advanced serialization that preserves properties of properties. Otherwise all 
//   enumerable properties are copied and added to this object as configurable, writable, and 
//   enumerable properties.
//
// "simpleSerialize":
//   Defaults to true if omitted.
//   Boolean value indicating whether simple serialization is used in the toJSON function for this object. 
//   When true, the object itself is returned in toJSON, and the object serializes in the same way 
//   other objects do. When false, this object's toJSON function returns an object with a single 
//   member: ETO_Observable_SerializedData.
function ETO_Observable(objectToCopy, simpleSerialize)
{
    // Initialize list of observers
    Object.defineProperty(this, "m_observers", { "value": [] });

    // 'objectToCopy' is optional and ignored if not a non-null object
    if (objectToCopy !== null && typeof objectToCopy === "object")
    {
	    // Check the argument for the special case serialized data
	    if ("ETO_Observable_SerializedData" in objectToCopy)
	    {
	    	var param = objectToCopy.ETO_Observable_SerializedData;

	    	// Add an observable property for each item in the array
	    	for (var i = 0; i < param.length; i++)
	    	{
	    		// If 'varType' is not a member, then it's not a valid descriptor
	    		var desc = param[i];
	    		if (desc.varType === undefined) { continue; }

	    		this.addDeserializedProperty(desc);
	    	}
	    }
	    else
	    {
	    	// Copy enumerable properties
	    	for (var name in objectToCopy)
	    		this.addProperty(name, objectToCopy[name], true, true, true);
	    }
    }

    if (typeof simpleSerialize === "undefined")
    	simpleSerialize = true;
    Object.defineProperty(this, "m_simpleSerialize", { "value": simpleSerialize });
}

// Adds an observer function that will be called when a property within this object changes value. The 
// observer function is called with a single argument that is an object with at least the following 
// properties:
//
// "sender":
//   Sender of this event notification. Note that this is NOT necessarily the object whose property is 
//   being changed, since other objects can forward changes events on behalf of another.
//
// "senders":
//   Array of senders that have forwarded this event. Last object in array is most recent sender.
//
// "object"
//   The object whose property is being changed.
//
// "name":
//   String for the property name that is changing. Note that the change could not only be a change in 
//   the value of this property, but could also be the property being added to or removed from the object.
//
// "oldValue":
//   Value of the property prior to the change. Set to undefined when a new property is being added.
//
// "userData":
//   The same userData object passed to this function when adding the observer
//
// The returned object is an "observer handle" that can be used to remove the observer if desired.
// If the callbackFunc parameter is null then null is returned. The userData parameter is allowed to be
// undefined or null if desired, but not the callback function.
ETO_Observable.prototype.addChangeObserver = function(callbackFunc, userData, thisForCallback)
{
    if (callbackFunc instanceof Function)
    {
    	if (thisForCallback == undefined)
    	    thisForCallback = this;

    	// Create an immutable observer handle
        var observerHandle = {
        	"callbackFunction": callbackFunc,
        	"userData": userData,
        	"callbackThis": thisForCallback
        };
        Object.freeze(observerHandle);
        this.m_observers.push(observerHandle);
        return observerHandle;
    }
    return null;
}

ETO_Observable.prototype.addDeserializedProperty = function(propDesc)
{
	// Get the global object (expected to be either window or global)
	var globalObj;
	if (typeof window == "undefined") { globalObj = global; }
	else { globalObj = window; }

	// If it's a primitive type, then we take the value as-is
	if (propDesc.varType == "string" || propDesc.varType == "boolean" ||
		propDesc.varType == "number")
	{
		return this.addProperty(
			propDesc.name, propDesc.value, propDesc.configurable, propDesc.writable,
			propDesc.enumerable);
	}

	// Coming here means it's not a primitive type
	// If the global object doesn't have a constructor function for the type, 
	// then it cannot be re-created
	if (!(globalObj[propDesc.varType] instanceof Function)) { return false; }

	// Attempt to reconstruct the object with the proper type
	var value = new globalObj[propDesc.varType](propDesc.value);

	// Add the property
	return this.addProperty(
	    propDesc.name, value, propDesc.configurable, propDesc.writable, 
	    propDesc.enumerable);
}

// addProperty(propertyName, propertyValue, removable, writable, isEnumerable)
//
// Adds a new property to this object. If the property name is null or a property with the specified
// name already exists in this object, then no change is made and false is returned. Parameters:
// "propertyName" (required):
//   A string for the name of the property to add. Cannot be null, undefined, or the reserved string 
//   "ETO_Observable_Properties".
//
// "propertyValue" (required):
//   The initial value of the property
//
// "removable" (optional, defaults to true if omitted):
//   Boolean value indicating whether or not the property can be removed from the object
//
// "writable" (optional, defaults to true if omitted):
//   Boolean value indicating whether or not the property can be written to
//
// "isEnumerable" (optional, defaults to true):
//   Boolean value indicating whether or not the property is enumerable
//
// On success, the property is added as an enumerable property and true is returned. On failure, 
// the property is not added and false is returned.
ETO_Observable.prototype.addProperty = function(propertyName, propertyValue, removable, writable, isEnumerable)
{
    // Reject special-case property names
    if (propertyName === null ||
        propertyName === undefined ||
        propertyName == "ETO_Observable_Properties") { return false; }
    
    // Make sure the name is a string
    propertyName = propertyName.toString();
    
    // Can't add a property that's already here
    if (this[propertyName] !== undefined) { return false; }
    
    // Setup defaults if necessary
    if (removable === undefined) { removable = true; }
    if (writable === undefined) { writable = true; }
    if (isEnumerable === undefined) { isEnumerable = true; }
    
    // Read-only properties are handled differently
    if (writable === false)
    {
        var props = {
        	enumerable: isEnumerable,
        	configurable: removable,
        	writable: false,
        	value: propertyValue
        };
        Object.defineProperty(this, propertyName, props);
    }
    else
    {
        // Define the property, including a setter that invokes the change callbacks if necessary
        var props = {
			enumerable: isEnumerable,
			configurable: removable,
			get: function() { return propertyValue; },
			set: function(value)
            {
                // If no change then return
                if (propertyValue === value) { return; }
                
                // Create the change details object
                var details = {
                	name: propertyName,
                	oldValue: propertyValue
                };
                
                // Set the new property value
                propertyValue = value;
				
				// Notify all observers
				this.notifyAll(details);
            }
        };
        Object.defineProperty(this, propertyName, props);
    }
    
    // We DO invoke the change callbacks when a property is added
    var details = {
		"name": propertyName,
		"oldValue": undefined,
		"object": this
	};
	this.notifyAll(details);
    
    return true;
}

// Adds a non-configurable/non-removable property that can only be set 
// by the returned setter function. Alls assignments to the property 
// will be ignored. Only the returned setter function will set the 
// value. If the property is added, the function is returned, otherwise 
// null is returned.
ETO_Observable.prototype.addPropertyWithPrivateSet = function(
    propertyName, propertyValue, isEnumerable)
{
    // Reject special-case property names
    if (propertyName === null ||
        propertyName === undefined ||
        propertyName == "ETO_Observable_Properties") { return null; }
    
    // Make sure the name is a string
    propertyName = propertyName.toString();
    
    // Can't add a property that's already here
    if (this[propertyName] !== undefined) { return null; }
    
    // Setup defaults if necessary
    if (isEnumerable === undefined) { isEnumerable = true; }
	
	var backingVar = propertyValue;
	var ownerObj = this;
	var setFunc = function(newValue)
	{
		// If no change then return
		if (backingVar === newValue) { return; }
		
		// Backup old value and set new
		var oldVal = backingVar;
		backingVar = newValue;
		
		// Invoke the change callbacks
		var details = {
			"name": propertyName,
			"oldValue": oldVal
		};
		ownerObj.notifyAll(details);
	};
    
    // Define the property (no setter!)
	var props = {
		"enumerable": isEnumerable,
		"configurable": false,
		"get": function() { return backingVar; }
	};
	Object.defineProperty(this, propertyName, props);
    
    // We DO invoke the change callbacks when a property is added
	this.notifyAll( {"name": propertyName, "oldValue": undefined, "object": this} );
    
	// Return the setter function
    return setFunc;
}

// addPropertyWithSetFilter(propertyName, propertyValue, setFilterFunc, removable, isEnumerable)
//
// Adds a new property to this object, that has a filter on values that can be set. The provided 
// function is called when an assignment to the property occurs, passing the potential new
// property value as the first parameter, and the existing property value as the second
// parameter. The filter function returns the value that is to become the new property value.
//
// When calling this function, if the property name is null or a property with the specified name
// already exists in this object, then no change is made and false is returned. Parameters:
//
// "propertyName" (required):
//   A string for the name of the property to add. Cannot be null, undefined, or the reserved string 
//   "ETO_Observable_Properties".
//
// "propertyValue" (required):
//   The initial value of the property
//
// "setPredicate" (required):
//   A predicate function that takes a single paramater P and returns true if the value of P 
//   can be set as the value of this property, and false if it cannot. 
//
// "removable" (optional, defaults to true if omitted):
//   Whether or not the property can be removed from the object
//
// "isEnumerable" (optional, defaults to true):
//   Whether or not the property is enumerable
//
// On success, the property is added as an enumerable property and true is returned.
ETO_Observable.prototype.addPropertyWithSetFilter = function(propertyName, propertyValue, setFilterFunc,
                                                             removable, isEnumerable)
{
    // Reject special-case property names
    if (propertyName === null ||
        propertyName === undefined ||
        propertyName == "ETO_Observable_Properties") { return false; }
		
	// Make sure setFilterFunc is a function
	if (!(setFilterFunc instanceof Function)) { return false; }
    
    // Make sure the name is a string
    propertyName = propertyName.toString();
    
    // Can't add a property that's already here
    if (this[propertyName] !== undefined) { return false; }
    
    // Setup defaults if necessary
    if (removable === undefined) { removable = true; }
    if (isEnumerable === undefined) { isEnumerable = true; }
    
    // Define the property, including a setter that calls the filter function and invokes
	// the change callbacks if necessary
    var us = this;
	var props = {
		enumerable: isEnumerable,
		configurable: removable,
		get: function() { return propertyValue; },
		set: function(value)
		{
			// First call the filter function
            value = setFilterFunc.call(us, value, propertyValue);
			
			// If no change then return
			if (propertyValue === value) { return; }
			
			// Backup old and set the new property value
			var oldValue = propertyValue;
			propertyValue = value;
			
			// Invoke the change callbacks
			this.notifyAll({ "name": propertyName, "oldValue": oldValue });
		}
	};
	Object.defineProperty(this, propertyName, props);
    
    // We DO invoke the change callbacks when a property is added
	this.notifyAll({ "name": propertyName, "oldValue": undefined, "object": this });
    
    return true;
}

// addROProperty(propertyName, propertyValue, isEnumerable)
//
// Adds a read-only property that cannot be removed or written to.
ETO_Observable.prototype.addROProperty = function(propertyName, propertyValue, isEnumerable)
{
	return this.addProperty(propertyName, propertyValue, false, false, isEnumerable);
}

// Notifies all observers of a property change. Mainly used internally inside 
// ETO_Observable and inheriting classes. The changeDetails object must have 
// "name" and "oldValue" members. If the object being changed is NOT 'this', 
// then changeDetails must also contain the "object" property.
// This method always adds "this" to the end of the "senders" array in the 
// change details before notifying the observers.
ETO_Observable.prototype.notifyAll = function(changeDetails)
{
	// If "object" is undefined in the changeDetails, then it is set to this
	if (changeDetails.object == undefined)
	    changeDetails.object = this;

	// If changeDetails is lacking the "senders" array, add it
	if (!("senders" in changeDetails))
	    changeDetails.senders = [this];
	// Otherwise add "this" to the existing array
	else
	    changeDetails.senders.push(this);

	for (var i = 0; i < this.m_observers.length; i++)
    {
        // Create a new change details object for each callback
		var details = {
			"sender": this,
			"senders": changeDetails.senders.concat([]), // concat empty array to clone
			"object": changeDetails.object,
			"name": changeDetails.name,
			"oldValue": changeDetails.oldValue,
			"userData": this.m_observers[i].userData
		};
		
		var func = this.m_observers[i].callbackFunction;
        func.call(this.m_observers[i].callbackThis, details);
    }
}

ETO_Observable.prototype.removeChangeObserver = function(observerHandle)
{
    for (var i = 0; i < this.m_observers.length; i++)
    {
        if (this.m_observers[i] == observerHandle)
        {
            this.m_observers.splice(i, 1);
            return true;
        }
    }
    return false;
}

ETO_Observable.prototype.removeProperty = function(propertyName)
{
    // If propertyName is omitted or null then return false
    if (propertyName === undefined || propertyName === null) { return false; }
    
    // Check to see if this object contains such a property
    if (this[propertyName] === undefined) { return false; }
    
    // Get information about the property
    var props = Object.getOwnPropertyDescriptor(this, propertyName);
    if (props.configurable === false)
    {
        // Can't remove this property
        return false;
    }
    
    // Create the change details object
    var changeDetails = {
    	"name": propertyName,
    	"oldValue": this[propertyName]
    };
    
    // Remove the property and invoke change callbacks
    delete this[propertyName];
    this.notifyAll(changeDetails);
    
    return true;
}

ETO_Observable.prototype.seal = function()
{
	Object.seal(this);
}

// Provides default serialization for ETO_Observable objects. Only serializes enumerable properties.
ETO_Observable.prototype.toJSON = function()
{
	if (this.m_simpleSerialize)
		return this;

	// ETO_Observable objects are serialized into an object with 1 member: ETO_Observable_SerializedData.
	// The ETO_Observable_SerializedData property is an array of objects, each of which is a property 
	// descriptor with the following members: name, value, enumerable, writable, configurable, varType
	var arr = new Array();

	// Iterate through enumerable properties only
	for (var name in this)
	{
		// A few exceptions
		if (name == "m_observers" || name == "m_toString") { continue; }

		var desc = Object.getOwnPropertyDescriptor(this, name);
		if (!desc) { continue; }

		// Build the details object
		var details = new Object();
		details.name = name;
		details.value = this[name];
		details.enumerable = desc.enumerable;
		if (desc.hasOwnProperty("set"))
		{
			// Presence of a setting implies it's writable
			details.writable = true;
		}
		else if (desc.hasOwnProperty("writable"))
		{
			details.writable = desc.writable;
		}
		else
		{
			// No "set" or "writable" members in the descriptor actually mean that the 
			// property IS writable. This is the default when those properties are not 
			// present in the descriptor.
			details.writable = true;
		}
		details.configurable = desc.configurable;

		// Make a string for the property type
		var typeName = typeof(this[name]);
		if (typeName == "object")
		{
			// Non-primitive type, so use constructor name as type name
			typeName = "" + this[name].constructor.name;
		}
		details.varType = typeName;

		// Add the details object to the array
		arr.push(details);
	}

	return { "ETO_Observable_SerializedData": arr};
}

ETO_Observable.prototype.toString = function()
{
    return "[object ETO_Observable]";
}

// ----------------------------------------------------------

// ETO_ObservableList([options])
// Constructor function for an observable list that can notify when the list changes. If the 'options' 
// parameter is provided, it will be expected to be an object with one or more of the following 
// members:
//
// "addValidator": function(item)
//   Reference to a function object that is called for each item attempting to be added to the list. If 
//   the function returns true for the specified item, then it will be permitted to be added to the list, 
//   otherwise the addition of the item to the list will be rejected.
//   If a additional validation function is not provided, then any item will be allowed to be added to 
//   the list.
//
// "objectToCopy" (Array or ETO_ObservableList):
//   Object to copy contents from.
function ETO_ObservableList(options)
{
    // Define the "private" (non-enumerable) storage array that stores each item as a tuple of the form:
    // [actualListItem, observerHandleIfItemIsETO_Observable]
    var storageProps = {
        enumerable: false,
        configurable: false,
        writable: false,
        value: new Array()
    };
    Object.defineProperty(this, "m_storage", storageProps);

    // Define the "private" (non-enumerable) array of observers. This is the list of outside sources 
    // that observe this list.
    var observersProps = {
        enumerable: false,
        configurable: false,
        writable: false,
        value: new Array()
    };
    Object.defineProperty(this, "m_observers", observersProps);

    // If an addition validation function was provided then store it
    if (options && options.addValidator instanceof Function)
    {
    	Object.defineProperty(this, "m_addValidator", { "value": options.addValidator });
    }

    // If the options contain an object to copy that has a "length" member, then copy
    if (options && options.objectToCopy && "length" in options.objectToCopy)
    {
    	for (var i = 0; i < options.objectToCopy.length; i++)
    	    this.add(options.objectToCopy[i]);
    }
}

// add(item[, insertionIndex])
// Function that adds as item to the list and, if successful, notifies observers after the add completes.
// The insertionIndex parameter is optional. If undefined, the item will be added to the end of the list.
// If defined but not a valid integer index in the range [0,length], no change is made to the list and
// false is returned. On success, true is returned.
ETO_ObservableList.prototype.add = function(item, insertionIndex)
{
    if (insertionIndex === undefined)
    {
        insertionIndex = this.m_storage.length;
    }
    else
    {
        // Validate the insertionIndex
        insertionIndex = parseInt(insertionIndex.toString(), 10);
        if (isNaN(insertionIndex)) { return false; }
        if (insertionIndex < 0 || insertionIndex > this.m_storage.length) { return false; }
    }

    // If there is an addition validator, then use it
    if (this.m_addValidator)
    {
    	if (this.m_addValidator(item) !== true) { return false; }
    }
    
    // If the item is ETO_Observable, then add a property-change observer
    var observerHandle = null;
    if (item instanceof ETO_Observable)
    {
    	// The way ETO_Observable is implemented, it gives the callback an info/details object 
    	// that is "ours", so we can change a few properties and forward it to our observers.

        var us = this;
        var itemChangeCallback = function(info)
        {
            info.listItem = item;
            info.index = insertionIndex;
            us.notifyObservers(info);
        };
        observerHandle = item.addChangeObserver(itemChangeCallback, this);
    }
    
    // Add the item to the array
    if (insertionIndex == this.m_storage.length)
    {
        // Add to end
        this.m_storage.push([item, observerHandle]);
    }
    else
    {
        // Insert at index
        this.m_storage.splice(insertionIndex, 0, [item, observerHandle]);
    }
    
    // Add/reset the properties for all necessary indices that have changed
    for (var i = insertionIndex; i < this.m_storage.length; i++)
    {
        this.makeIndexProperty.call(this, i);
    }
    
    // Notify observers
    this.notifyObservers({
        "listChangeType": "add",
        "index": insertionIndex,
        "object": this,
        "name": insertionIndex.toString()
    });
    
    return true;
}

// addChangeObserver(callback, userData[, wantsItemChangesToo])
//
// Function that adds a change observer, which is just a callback function, to the observer list. The 
// callback function is called with a single object parameter that indicates the change details. This 
// object has the following members:
//
// "sender" and "senders": (same specification as ETO_Observable)
//
// "name":
//   If an item is being added, removed, or replaced -> the string for the index of the item.
//   Otherwise -> the name of the property in the list item whose property is changing.
//
// "object":
//   Either this list if an item is being added, removed, or replaced, otherwise the object whose 
//   property is changing. In the latter case, the object will be an item in this list, or a 
//   descendant property of an item in this list.
//
// "listChangeType":
//   Present only if an item is being added to, removed from, or replaced in this list. Value is
//   "add", "remove", or "replace" in those cases, respectively.
//
// "index":
//   Numerical index of item associated with event. May refer to an item in the list that has been
//   altered in the case of removals.
//
// "userData":
//   The same userData item that was passed when adding this observer.
ETO_ObservableList.prototype.addChangeObserver = function(callbackFunc, userData, wantsItemChangesToo)
{
	// Setup default value if need be
	if (wantsItemChangesToo !== true) { wantsItemChangesToo = false; }
    
    // Provided the callback function is not undefined or null, then add the observer
    if (callbackFunc !== undefined && callbackFunc !== null)
    {
		// Create the immutable observer handle
		var observerHandle = new Object();
		observerHandle.callback = callbackFunc;
		observerHandle.userData = userData;
		observerHandle.observesItemChanges = wantsItemChangesToo;
		Object.freeze(observerHandle);

        // Store the observer handle and then return it
        this.m_observers.push(observerHandle);
        return observerHandle;
    }
    return null;
}

// at(index)
//
// Function that returns the item at the specified index in the list, or undefined if the index is
// out of range.
ETO_ObservableList.prototype.at = function(index)
{
    if (typeof index == "undefined" || index < 0 || index >= this.m_storage.length)
        return undefined;
    return this.m_storage[index][0];
}

ETO_ObservableList.prototype.clear = function()
{
    this.remove(0, this.length);
}

// every(callback[, thisArg])
//
// Returns true if every element in the list satisfies the callback predicate, false otherwise.
ETO_ObservableList.prototype.every = function(callback, thisArg)
{
	if (!thisArg) { thisArg = this; }

	for (var i = 0; i < this.m_storage.length; i++)
    {
        if (!callback.call(thisArg, this.m_storage[i][0], i, this))
            return false;
    }

    // Arriving here implies that every item satisfied the predicate
    return true;
}

ETO_ObservableList.prototype.filter = function(predicate, predicateThis)
{
	// Set the default if predicateThis is undefined
	if (typeof predicateThis === "undefined")
		predicateThis = this;

	// Initialize a new list and add all predicate-satisfying items
    var result = new ETO_ObservableList();
    for (var i = 0; i < this.m_storage.length; i++)
    {
    	var item = this.m_storage[i][0];
    	if (predicate.call(predicateThis, item))
    	    result.push(item);
    }
    return result;
}

// first(predicate[, startIndex])
//
// Function that goes through items in the list, in order, returning the first one that satisfies the
// predicate function. The predicate function is invoked with the following parameters:
// 1. item - item in this list
// 2. index - index of the item in this list
// 3. listObj - reference to the ETO_ObservableList that forEach is being applied to
// When the predicate returns true, the item is returned. If the predicate never returns true then
// undefined is returned.
ETO_ObservableList.prototype.first = function(predicate, startIndex)
{
    var item = undefined;
    
    // Use foreach with our custom callback
    var callback = function(listItem, index, listObj, token)
    {
        if (predicate(listItem, index, listObj) === true)
        {
            item = listItem;
            return token;
        }
        return null;
    };
    this.forEach(callback, this, startIndex);
    
    return item;
}

// forEach(callback[, thisArg, startIndex])
//
// Function that goes through all items in the the list, in order, invoking the callback function for
// each one. The callback function is invoked with the following parameters:
// 1. item - item in this list
// 2. index - index of the item in this list
// 3. listObj - reference to the ETO_ObservableList that forEach is being applied to
// 4. terminationToken - reference to a termination token object. If the callback function returns
//    this token, then the forEach loop will be terminated. All other return values from the callback
//    function are ignored.
ETO_ObservableList.prototype.forEach = function(callback, thisArg, startIndex)
{
    var stride = 1;
    var terminationToken = new Object();
    
    // Initialize defaults for optional parameters, if need be
    if (startIndex === undefined) { startIndex = 0; }
    if (!thisArg) { thisArg = this; }
    
    for (var i = startIndex; i < this.m_storage.length && i >= 0; i += stride)
    {
        if (callback.call(thisArg, this.m_storage[i][0], i, this, terminationToken) === terminationToken)
            break;
    }
}

// indexOf(item[, startIndex])
//
// Returns the index of the item in this list or -1 if not found.
ETO_ObservableList.prototype.indexOf = function(item, startIndex)
{
    var result = -1;
    var storeFirstIndex = function(listItem, index, listObj, token)
    {
        if (item === listItem)
        {
            result = index;
            return token;
        }
        return null;
    };
    this.forEach(storeFirstIndex, this, startIndex);
    return result;
}

ETO_ObservableList.prototype.last = function(predicate, startIndex)
{
    var item = undefined;
    
    // Use foreach with our custom callback
    var callback = function(listItem, index, listObj, token)
    {
        if (predicate(listItem, index, listObj) === true)
        {
            item = listItem;
        }
        return null;
    };
    this.forEach(callback, this, startIndex);
    
    return item;
}

// length
//
// Read-only property that gets the length of the list
Object.defineProperty(ETO_ObservableList.prototype, "length",
{ "enumerable": true, "get": function() { return this.m_storage.length; } } );

// makeIndexProperty(index)
//
// Private function to make an index property for the list. This is what allows for
// "indexed-access" usage in the form of "list[someIndex]".
ETO_ObservableList.prototype.makeIndexProperty = function(index)
{
    var owningList = this;
    var storage = this.m_storage;
    var indexProps = {
        "enumerable": true,
        "configurable": true,
        "get": function() { return storage[index][0]; },
        "set": function(newItem)
        {
        	// Get the existing item
	    	var item = this.m_storage[index];

	    	// One special case for the exact same item
	    	if (item[0] === newItem)
	    		return;

	    	// If the existing item is an ETO_Observable object, the change 
            // observer must be removed.
            if (item[1])
		    	item[0].removeChangeObserver(item[1]);
        	
            // What's happening is a replacement of the form: theList[x] = y
            // This means the "x" property of the list is changing, so the change
            // details are constructed accordingly.
            var changeDetails = {
                "name": index.toString(),
                "object": owningList,
                "listChangeType": "replace",
                "index": index,
                "oldValue": item[0]
            };
            
            // Set the item and add an observer if necessary
            storage[index][0] = newItem;
            if (newItem instanceof ETO_Observable)
            {
		        var itemChangeCallback = function(info)
		        {
		            info.listItem = newItem;
		            info.index = index;
		            owningList.notifyObservers(info);
		        };
            	storage[index][1] = newItem.addChangeObserver(itemChangeCallback, this);
            }
            else
            	storage[index][1] = null;

            // Notify of the change
            owningList.notifyObservers(changeDetails);
        }
    };
    Object.defineProperty(this, index.toString(), indexProps);
}
Object.defineProperty(ETO_ObservableList.prototype, "makeIndexProperty",
{ "value": ETO_ObservableList.prototype.makeIndexProperty });

// notifyObservers(changeDetails)
//
// Function that that notifies all observers in the m_observers list. The details object
// is expected to be populated with all relevant details except for "sender" and "userData", which 
// will be filled in by this function.
ETO_ObservableList.prototype.notifyObservers = function(changeDetails)
{
    // If "object" is missing in the changeDetails, then it is set to this
    if (!("object" in changeDetails))
        changeDetails.object = this;
    
    // If changeDetails is lacking the "senders" array, add it
    if (!("senders" in changeDetails))
        changeDetails.senders = [this];
    // Otherwise add "this" to the existing array
    else
        changeDetails.senders.push(this);
    
    for (var i = 0; i < this.m_observers.length; i++)
    {
    	var obs = this.m_observers[i];

    	// If the object is not this list and this particular observer did not want to
    	// be notified of such events, then skip.
    	if (changeDetails.object !== this && !obs.observesItemChanges)
    	    continue;

    	// Make a deep copy of the details object, then set the "sender" and "userData" values
    	var detailsCopy = new Object();
    	for (var propName in changeDetails)
    	{
            if (propName != "sender" && propName != "senders")
                detailsCopy[propName] = changeDetails[propName];
    	}
    	detailsCopy.sender = this;
        detailsCopy.senders = changeDetails.senders.concat([]); // concat empty array to clone
    	detailsCopy.userData = obs.userData;
    	obs.callback.call(this, detailsCopy);
    }
}

// push: (same as "add" function)
ETO_ObservableList.prototype.push = ETO_ObservableList.prototype.add;

// remove(startIndex[, count])
//
// Removes a range of items given a starting index and count. The starting index must be 
// in the range [0,length-1], or else no action will be taken and 0 will be returned. 
// On success, the number of items removed is returned. 
// The 'count' parameter is optional and defaults to 1. If provided, count must be a 
// positive integer value.
ETO_ObservableList.prototype.remove = function(startIndex, count)
{
    // Set default for count if undefined
    if (typeof count == "undefined") { count = 1; }

    // Check startIndex parameter
    if (startIndex < 0 || startIndex >= this.length) { return 0; }
    // Check count parameter
    if (count <= 0) { return 0; }

    // Lower count if it goes past the end
    if (startIndex + count > this.length)
    {
        count = this.length - startIndex;
    }

    // Remove index properties for all items from starting index to end. Even though some 
    // of these items are not being removed, index properites will need to be redefined.
    for (var i = startIndex; i < this.length; i++)
    {
        delete this[i.toString()];
    }

    // Splice out the items we're removing
    var removed = this.m_storage.splice(startIndex, count);

    // Re-create index properties for items still in the list at or after the start
    for (var i = startIndex; i < this.length; i++)
    {
        this.makeIndexProperty(i);
    }

    // For each removed object, remove our change observer if we had one, then notify all 
    // observers of this list that the item has been removed.
    for (var i = 0; i < removed.length; i++)
    {
    	// If we are observing this object, remove the change observer
    	var item = removed[i];
	    if (item[1])
	    {
	    	item[0].removeChangeObserver(item[1]);
	    }
	    
	    // Notify observers
	    var details = {
            "name": (startIndex + i).toString(),
	        "oldValue": item[0],
            "object": this,
	        "listChangeType": "remove",
	        "index": i + startIndex
	    };
	    this.notifyObservers(details);
    }

    return removed.length;
}

ETO_ObservableList.prototype.removeChangeObserver = function(observerHandle)
{
    for (var i = 0; i < this.m_observers.length; i++)
    {
        if (this.m_observers[i] == observerHandle)
        {
            this.m_observers.splice(i, 1);
            return true;
        }
    }
    return false;
}

ETO_ObservableList.prototype.removeLast = function()
{
    if (this.m_storage.length === 0)
    {
    	// Can't remove from empty list
        return false;
    }
    
    return this.remove(this.m_storage.length - 1) == 1;
}

// splice(startIndex[, deleteCount])
//
// Parameter specification copied directly from MDN's array.splice documentation on May 11, 2018:
//
// "startIndex":
//   Index at which to start changing the array (with origin 0). If greater than the length of 
//   the array, actual starting index will be set to the length of the array. If negative, will 
//   begin that many elements from the end of the array (with origin -1) and will be set to 0 if 
//   absolute value is greater than the length of the array.
//
// "deleteCount":
//   An integer indicating the number of old array elements to remove.
//   If deleteCount is omitted, or if its value is larger than array.length - start (that is, if 
//   it is greater than the number of elements left in the array, starting at start), then all of 
//   the elements from start through the end of the array will be deleted.
//   If deleteCount is 0 or negative, no elements are removed. In this case, you should specify 
//   at least one new element (see below).
//
// "item1", "item2", ... (optional):
//   The elements to add to the array, beginning at the start index. If you don't specify any 
//   elements, splice() will only remove elements from the array.
ETO_ObservableList.prototype.splice = function(startIndex, deleteCount)
{
	if (startIndex > this.length)
		startIndex = this.length;
	else if (startIndex < -this.length)
		startIndex = 0;
	else if (startIndex < 0)
		startIndex = this.length + startIndex;
	
    if (typeof deleteCount === "undefined" || deleteCount > this.length - startIndex)
    	deleteCount = this.length - startIndex;

    // Remove the items and return array of removed items
    var removedItems = new Array();
    for (var i = startIndex; i < this.m_storage.length; i++)
    {
    	removedItems.push(this.m_storage[i][0]);
    }
    this.remove(startIndex, deleteCount);

    // If more than 2 arguments exist, items need to be inserted
    for (var i = 2; i < arguments.length; i++)
    {
    	this.add(arguments[i], startIndex + (i - 2));
    }

    return removedItems;
}

ETO_ObservableList.prototype.toArray = function()
{
    var result = [];
    for (var i = 0; i < this.m_storage.length; i++)
        result.push(this.m_storage[i][0]);
    return result;
}

ETO_ObservableList.prototype.toJSON = function()
{
	// An ETO_ObservableList serializes as an array
	return this.toArray();
}

ETO_ObservableList.prototype.toString = function()
{
    // Special case for empty list
    if (this.length === 0) { return ""; }
    
    // Produce an array-style string of comma-separated elements
    var str = "";
    var i = 0;
    while (i < this.length - 1)
    {
        str += (this.at(i).toString() + ",");
        i++;
    }
    str += this.at(i).toString();
    return str;
}

// Author:
// Evan Thomas Olds
//
// Creation Date:
// November 5, 2016
//
// Declared "classes" in this file:
// ETO_vec2

// Constructs an immutable 2-component (x,y) vector
function ETO_vec2(paramA, yValue)
{
	if (paramA.x && paramA.y)
	{
		this.x = paramA.x;
    	this.y = paramA.y;
	}
    else
    {
    	this.x = paramA;
    	this.y = yValue;
    }
    Object.freeze(this);
}

// add(othervec2_or_x[, y])
// Function that adds an (x,y) ordered pair to the x and y components of this vector and returns the
// result as a new ETO_vec2 object. Recall that the ETO_vec2 objects are immutable.
// There are 2 supported calling options:
// 1. Single parameter of type ETO_vec2
// 2. Two parameters that are numerical values
ETO_vec2.prototype.add = function(otherVec2_x, y)
{
    if (y === undefined)
    {
        return new ETO_vec2(this.x + otherVec2_x.x, this.y + otherVec2_x.y);
    }
    return new ETO_vec2(this.x + otherVec2_x, this.y + y);
}

// distance(othervec2_or_x[, y])
// Function that returns the unsigned distance between this vector as a point (x,y) and another
// (x,y) point.
// There are 2 supported calling options:
// 1. Single parameter of type ETO_vec2
// 2. Two parameters that are numerical values for the ordered pair (x,y)
ETO_vec2.prototype.distance = function(otherPoint_x, y)
{
    if (y === undefined)
    {
        // No y param means 1st param is expected to be of type ETO_vec2
        var xDiff = this.x - otherPoint_x.x;
        var yDiff = this.y - otherPoint_x.y;
        return Math.sqrt(xDiff * xDiff + yDiff * yDiff);
    }
    var xDiff = this.x - otherPoint_x;
    var yDiff = this.y - y;
    return Math.sqrt(xDiff * xDiff + yDiff * yDiff);
}

// div(scalarValue)
// Function that returns a new vector representing this vector divided by the specified scalar value.
// Does NOT have a special case for when the scalar value is 0. It will divide by 0 in that case.
ETO_vec2.prototype.div = function(scalarValue)
{
    return new ETO_vec2(this.x / scalarValue, this.y / scalarValue);
}

// dot(othervec2_or_x[, y])
// Function that returns the dot product this this and the other vector.
// There are 2 supported calling options:
// 1. Single parameter of type ETO_vec2
// 2. Two parameters that are numerical values for the ordered pair (x,y)
ETO_vec2.prototype.dot = function(othervec2_or_x, y)
{
    if (y === undefined)
    {
        return this.x * othervec2_or_x.x + this.y * othervec2_or_x.y
    }
    return this.x * othervec2_or_x + this.y * y;
}

// equals(otherVec)
// equals(x,y)
ETO_vec2.prototype.equals = function(other_x, y)
{
	if (other_x instanceof ETO_vec2)
	{
		return this.x === other_x.x && this.y === other_x.y;
	}
	return this.x === other_x && this.y === y;
}

ETO_vec2.prototype.getCCWAngle = function()
{
    // Handle special cases
    if (this.x == 0)
    {
        if (this.y == 0)
        {
            return 0.0;
        }
        
        return (this.y >= 0) ? (Math.PI / 2.0) : (3.0 * Math.PI / 2.0);
    }
    
    // Handle cases based on quadrant
    if (this.x >= 0)
    {
        if (this.y >= 0)
        {
            // Quadrant 1
            return Math.atan(this.y / this.x);
        }
        // Else quadrant 4
        return 2.0 * Math.PI - Math.atan(-this.y / this.x);
    }
    else if (this.y >= 0)
    {
        // Quadrant 2
        return Math.PI - Math.atan(-this.y / this.x);
    }
    
    // Else quadrant 3
    return Math.PI + Math.atan(this.y / this.x);
}

// Returns the length of this vector
ETO_vec2.prototype.getLength = function()
{
    return Math.sqrt(this.x * this.x + this.y * this.y);
}

// Returns the length of this vector, squared. This is computed more quickly than the length.
ETO_vec2.prototype.getLengthSquared = function()
{
    return this.x * this.x + this.y * this.y;
}

// getPerp()
// Function that returns a new vector that is perpendicular to this one.
ETO_vec2.prototype.getPerp = function()
{
    return new ETO_vec2(-this.y, this.x);
}

// length
// Read-only property that gets the length of this vector
Object.defineProperty(ETO_vec2.prototype, "length",
{enumerable: true, get: function() { return this.getLength(); }});

// lengthSquared
// Read-only property that gets the squared length of this vector
Object.defineProperty(ETO_vec2.prototype, "lengthSquared",
{enumerable: true, get: function() { return this.getLengthSquared(); }});

// mul(scalarValue)
// Function that returns a new vector representing this vector multiplied by the specified scalar value
ETO_vec2.prototype.mul = function(scalarValue)
{
    return new ETO_vec2(this.x * scalarValue, this.y * scalarValue);
}

// normalize()
// Function that returns a new vector that represents the normalized version of this vector. If this
// vector has a length of zero, then a reference to this vector is returned. In all other cases the
// returned vector is of length 1.
ETO_vec2.prototype.normalize = function()
{
    var len = this.getLength();
    if (len != 0)
    {
        return new ETO_vec2(this.x / len, this.y / len);
    }
    return this;
}

ETO_vec2.prototype.rotate = function(angle)
{
	return new ETO_vec2(
		this.x * Math.cos(angle) + this.y * Math.sin(angle),
    	-this.x * Math.sin(angle) + this.y * Math.cos(angle));
}

// Returns the scalar projection of this instance onto the specified vector "ontoMe", which must
// not be a zero length vector or a division by zero will occur.
ETO_vec2.prototype.scalarProject = function(ontoMe)
{
    return (this.x * ontoMe.x + this.y * ontoMe.y) / ontoMe.getLength();
}

// Returns a new vector that has the same direction of this one, but with the specified length. If
// this vector is (0,0) then a (0,0) vector is returned (it will be the same reference as this one).
ETO_vec2.prototype.setLength = function(newLength)
{
    var len = this.getLength();
    if (len != 0)
    {
        return new ETO_vec2(this.x * newLength / len, this.y * newLength / len);
    }
    return this;
}

// Subtracts an (x,y) ordered pair from the x and y components of this vector and returns the result
// as a new ETO_vec2 object. Recall that the ETO_vec2 objects are immutable.
// There are 2 supported calling options:
// 1. Single parameter of type ETO_vec2
// 2. Two parameters that are numerical values
ETO_vec2.prototype.sub = function(otherVec2_x, y)
{
    if (y === undefined)
    {
        return new ETO_vec2(this.x - otherVec2_x.x, this.y - otherVec2_x.y);
    }
    return new ETO_vec2(this.x - otherVec2_x, this.y - y);
}

ETO_vec2.prototype.toString = function()
{
    return this.x + "," + this.y;
}

// X
// Read-only property that gets the x-value of this vector. This is provided just so that both lower-
// and upper-case variants can be used.
Object.defineProperty(ETO_vec2.prototype, "X",
{enumerable: true, get: function() { return this.x; }});

// Y
// Read-only property that gets the y-value of this vector. This is provided just so that both lower-
// and upper-case variants can be used.
Object.defineProperty(ETO_vec2.prototype, "Y",
{enumerable: true, get: function() { return this.y; }});

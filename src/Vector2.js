
// No operator overloading?? Gah
var Vector2 = function(XVal, YVal)
{
    this.X = XVal;
    this.Y = YVal;

    this.Add = function(VecA)
    {
        this.X += VecA.X;
        this.Y += VecA.Y;
    }

    this.Subtract = function(VecA)
    {
        this.X -= VecA.X;
        this.Y -= VecA.Y;
    }

    this.MultiplyByScalar = function(Num)
    {
        this.X *= Num;
        this.Y *= Num;
    }

    this.Length = function()
    {
        return Math.sqrt(this.X * this.X + this.Y * this.Y);
    }

    this.Normalize = function()
    {
        var RetVal = new Vector2(0.0, 0.0);
        var Len = this.Length();
        
        if  (Len == 0.0)
        {
            return RetVal;
        }

        RetVal.X = this.X / Len;
        RetVal.Y = this.Y / Len;

        return RetVal;
    }
}

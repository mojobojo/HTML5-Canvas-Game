var DefaultCanvasWidth = 1280;
var DefaultCanvasHeight = 720;

var Canvas = document.getElementById("GameCanvas");
var Context = Canvas.getContext("2d");

// Timestep stuff
var Timestep = 1.0 / 60.0;
var GameTime = 0.0;

// Input stuff
var Keys = [];
var KEY_W = 87;
var KEY_S = 83;
var KEY_A = 65;
var KEY_D = 68;
var KEY_UP = 38;
var KEY_DOWN = 40;
var KEY_LEFT = 37;
var KEY_RIGHT = 39;

// Game relateds variables here
var CurrentTime = 0;
var LastTime = Date.now();
var PlayerSpeed = 700.0;
var PlayerDirection = new Vector2(0.0, 0.0);
var PlayerPosition = new Vector2(100.0, 100.0);
var PlayerVelocity = new Vector2(0.0, 0.0);
var DirectionCopy = new Vector2(0.0, 0.0);

var Bullets = []
var BulletFireSpeed = 0.5;
var BulletFireSpeedTimer = 0.0;
var ReadyToShoot = false;

var BadGuys = [];

var HitTexts = [];

var MaxParticles = 128;
var Particles = [];

var Particle = function(X, Y, InLifespan)
{
    this.Position = new Vector2(X, Y);
    this.Lifespan = InLifespan;

    this.Update = function(DeltaTime)
    {
        if (this.Lifespan > 0.0)
        {

        }

        this.Lifespan -= DeltaTime;
    }

    this.Render = function()
    {
        if (this.Lifespan > 0.0)
        {
            DrawFilledRectangle(this.Position.X, this.Position.Y, 4, 4, "#FF0000");
        }
    }
}

var AnimatedText = function(X, Y, InText)
{
    this.Position = new Vector2(X, Y);
    this.Text = InText;
    this.Lifespan = 0.5;
    this.Dead = false;
    this.Speed = 1000.0;

    this.YVelocity = 0.0;

    this.Update = function(DeltaTime)
    {
        if (this.Lifespan <= 0.0)
        {
            this.Dead = true;
        }

        var YDirection = -1.0 * this.Speed;

        this.Position.Y += 0.5 * YDirection * Math.pow(DeltaTime, 2) + this.YVelocity * DeltaTime;
        this.YVelocity = YDirection * DeltaTime + this.YVelocity;

        this.Lifespan -= DeltaTime;
    }

    this.Render = function()
    {
        if (!this.Dead)
        {
            DrawText(this.Position.X, this.Position.Y, this.Text, true, "#FFF000");
        }
    }
}

var Rectangle = function(InX, InY, InWidth, InHeight)
{
    this.X = InX;
    this.Y = InY;
    this.Width = InWidth;
    this.Height = InHeight;
}

var Projectile = function(InLifespan, InDirection, InPosition)
{
    this.Lifespan = InLifespan;
    this.Direction = InDirection;
    this.Position = new Vector2(InPosition.X, InPosition.Y);
    this.Dead = false;
    this.Speed = 256.0;
    this.CollisionRect = new Rectangle(0, 0, 4, 4);

    this.Update = function(DeltaTime)
    {
        if (this.Lifespan > 0.0)
        {
            var FinalPos = new Vector2(0.0, 0.0);
            FinalPos.X = this.Direction.X;
            FinalPos.Y = this.Direction.Y;

            FinalPos.MultiplyByScalar(DeltaTime * this.Speed);
            this.Position.Add(FinalPos);

            this.Dead = false;  
        }
        else
        {
            this.Dead = true;
        }

        this.Lifespan -= DeltaTime;
    }

    this.Render = function()
    {
        if (this.Lifespan > 0.0)
        {
            DrawFilledRectangle(this.Position.X, this.Position.Y, this.CollisionRect.Width, this.CollisionRect.Height, true, "#0000FF");
        }
    }

    this.GetCollision = function()
    {
        var RetVal = new Rectangle(
            this.Position.X - (0.5 * this.CollisionRect.Width), 
            this.Position.Y - (0.5 * this.CollisionRect.Height), 
            this.CollisionRect.Width, 
            this.CollisionRect.Height
            );

        return RetVal;
    }
}

var BadGuy = function(InPosition)
{
    this.Position = InPosition;
    this.Direction = new Vector2(0.0, 0.0);
    this.Velocity = new Vector2(0.0, 0.0);
    this.Speed = 500.0;
    this.CollisionRect = new Rectangle(0, 0, 32, 32);
    this.Health = 1.0;
    this.Dead = false;

    this.Update = function(DeltaTime)
    {
        var LastPosition = new Vector2(PlayerPosition.X, PlayerPosition.Y);
        var Bleh = new Vector2(PlayerPosition.X, PlayerPosition.Y);

        Bleh.X = Bleh.X - this.Position.X;
        Bleh.Y = Bleh.Y - this.Position.Y;

        if (Bleh.Length() <= 10.0)
        {
            return;
        }
        
        var Normal = Bleh.Normalize();

        this.Direction.X = Normal.X;
        this.Direction.Y = Normal.Y;

        this.Direction.MultiplyByScalar(this.Speed);

        // TODO: Really need to get vector math working
        this.Direction.X += 5.0 * -this.Velocity.X;
        this.Direction.Y += 5.0 * -this.Velocity.Y;

        this.Position.X += 0.5 * this.Direction.X * Math.pow(DeltaTime, 2) + this.Velocity.X * DeltaTime;
        this.Position.Y += 0.5 * this.Direction.Y * Math.pow(DeltaTime, 2) + this.Velocity.Y * DeltaTime;
        this.Velocity.X = this.Direction.X * DeltaTime + this.Velocity.X;
        this.Velocity.Y = this.Direction.Y * DeltaTime + this.Velocity.Y;

        for (var i = 0; i < Bullets.length; i++)
        {
            var ColA = this.GetCollision();
            var ColB = Bullets[i].GetCollision();

            if (DoesRectangleIntersectAnother(ColA, ColB))
            {
                Bullets[i].Lifespan = 0.0;
                Bullets[i].Dead = true;

                // Serioulsy works and I dont know why. When bullet collides baddie moves in the right direction wtf
                // this code shouldnt work
                this.Velocity.X = -this.Velocity.X;
                this.Velocity.Y = -this.Velocity.Y;

                var DamageDealt = 0.1;
                this.Health -= DamageDealt;

                HitTexts.push(new AnimatedText(this.Position.X, this.Position.Y, DamageDealt.toString()));

                break;
            }
        }

        if (this.Health <= 0.0)
        {
            this.Dead = true;
            BadGuys.push(new BadGuy(new Vector2(RandomInt(0, DefaultCanvasWidth), RandomInt(0, DefaultCanvasHeight))));



            AddParticle(this.Position.X, this.Position.Y, 5.0);   
        }
    }

    this.Render = function()
    {
        DrawFilledRectangle(this.Position.X, this.Position.Y, this.CollisionRect.Width, this.CollisionRect.Height, true, "#FF0000");    
    }

    this.GetCollision = function()
    {
        var RetVal = new Rectangle(
            this.Position.X - (0.5 * this.CollisionRect.Width), 
            this.Position.Y - (0.5 * this.CollisionRect.Height), 
            this.CollisionRect.Width, 
            this.CollisionRect.Height
            );

        return RetVal;
    }
}

function
DoesRectangleIntersectAnother(A, B)
{
    var TopX = Math.max(A.X, B.X);
    var TopY = Math.max(A.Y, B.Y);
    var BottomX = Math.min(A.X + A.Width, B.X + B.Width);
    var BottomY = Math.min(A.Y + A.Width, B.Y + B.Height);

    var b1 = TopX <= BottomX;
    var b2 = TopY <= BottomY;

    return b1 && b2;
}

function
KeyDown(e)
{
    Keys[e.keyCode] = true;
}

function
KeyUp(e)
{
    Keys[e.keyCode] = false;
}

function
RandomInt(Min, Max)
{
    return Math.floor(Math.random() * (Max - Min)) + Min;
}

function
RandomFloat(Min, Max)
{
    return Math.random() * (Min - Max) + Min;
}

function
CircularRandomPlot(Radius)
{
    var TestX = RandomFloat(0.0, 1.0) * 2.0 * Radius - Radius;
    var YLimit = Math.sqrt(Radius * Radius - TestX * TestX);
    var TestY = RandomFloat(0.0, 1.0) * 2.0 * YLimit - YLimit;

    return new Vector2(TestX, TestY);
}

function
UpdateProjectiles(DeltaTime)
{
    var MarkedDead = [];

    for (var i = 0; i < Bullets.length; i++)
    {
        Bullets[i].Update(DeltaTime);

        if (Bullets[i].Dead)
        {
            MarkedDead.push(i);
        }
    }

    for (var i = 0; i < MarkedDead.length; i++)
    {
        Bullets.splice(MarkedDead[i], 1);        
    }

    BulletFireSpeedTimer -= DeltaTime;

    if (BulletFireSpeedTimer <= 0.0)
    {
        ReadyToShoot = true;
    }
}

function
UpdatePlayer(DeltaTime)
{
    PlayerDirection.MultiplyByScalar(PlayerSpeed);

    // TODO: Really need to get vector math working
    PlayerDirection.X += 5.0 * -PlayerVelocity.X;
    PlayerDirection.Y += 5.0 * -PlayerVelocity.Y;

    PlayerPosition.X += 0.5 * PlayerDirection.X * Math.pow(DeltaTime, 2) + PlayerVelocity.X * DeltaTime;
    PlayerPosition.Y += 0.5 * PlayerDirection.Y * Math.pow(DeltaTime, 2) + PlayerVelocity.Y * DeltaTime;
    PlayerVelocity.X = PlayerDirection.X * DeltaTime + PlayerVelocity.X;
    PlayerVelocity.Y = PlayerDirection.Y * DeltaTime + PlayerVelocity.Y;
}

function
UpdateHitTexts(DeltaTime)
{
    var DeadTexts = [];
    for (var i = 0; i < HitTexts.length; i++)
    {
        HitTexts[i].Update(DeltaTime);

        if (HitTexts[i].Dead)
        {
            DeadTexts.push(i);
        }
    }

    for (var i = 0; i < DeadTexts.length; i++)
    {
        HitTexts.splice(DeadTexts[i], 1);        
    }
}

function
UpdateBadGuys(DeltaTime)
{
    var DeadGuys = [];
    for (var i = 0; i < BadGuys.length; i++)
    {
        BadGuys[i].Update(DeltaTime);

        if (BadGuys[i].Dead)
        {
            DeadGuys.push(i);
        }
    }

    for (var i = 0; i < DeadGuys.length; i++)
    {
        BadGuys.splice(DeadGuys[i], 1);        
    }

}

function
AddParticle(X, Y, Lifespan)
{
    // Trying something a little different like I do in C to avoid having
    // to use lists that make memory allocate and unallocate every frame
    for (var i = 0; i < MaxParticles; i++)
    {
        if (Particles[i].Lifespan <= 0.0)
        {
            Particles[i].Position.X = X;
            Particles[i].Position.Y = Y;
            //Particles[i].Direction.X = DirectionX;
            //Particles[i].Direction.Y = DirectionY;
            Particles[i].Lifespan = Lifespan;
            break;
        }
    }
}

function
UpdateParticles(DeltaTime)
{
    for (var i = 0; i < MaxParticles; i++)
    {
        Particles[i].Update(DeltaTime);
    }
}

function
Update(DeltaTime)
{
    PlayerDirection.X = 0.0;
    PlayerDirection.Y = 0.0;

    if (Keys[KEY_W] == true)
    {
        PlayerDirection.Y = -1.0;
    }
    if (Keys[KEY_S] == true)
    {
        PlayerDirection.Y = 1.0;
    }
    if (Keys[KEY_A] == true)
    {
        PlayerDirection.X = -1.0;
    }
    if (Keys[KEY_D] == true)
    {
        PlayerDirection.X = 1.0;
    }

    if (ReadyToShoot)
    {
        var ShootDirection = new Vector2(0.0, 0.0);
        if (Keys[KEY_UP] == true)
        {
            ShootDirection.X = 0.0;
            ShootDirection.Y = -1.0;
            ShootingProjectile = true;
            BulletFireSpeedTimer = BulletFireSpeed;
            ReadyToShoot = false;
            Bullets.push(new Projectile(2.0, ShootDirection, PlayerPosition));
        }
        if (Keys[KEY_DOWN] == true)
        {
            ShootDirection.X = 0.0;
            ShootDirection.Y = 1.0;
            ShootingProjectile = true;
            BulletFireSpeedTimer = BulletFireSpeed;
            ReadyToShoot = false;
            Bullets.push(new Projectile(2.0, ShootDirection, PlayerPosition));
        }
        if (Keys[KEY_LEFT] == true)
        {
            ShootDirection.X = -1.0;
            ShootDirection.Y = 0.0;
            ShootingProjectile = true;
            BulletFireSpeedTimer = BulletFireSpeed;
            ReadyToShoot = false;
            Bullets.push(new Projectile(2.0, ShootDirection, PlayerPosition));
        }
        if (Keys[KEY_RIGHT] == true)
        {
            ShootDirection.X = 1.0;
            ShootDirection.Y = 0.0;
            ShootingProjectile = true;
            BulletFireSpeedTimer = BulletFireSpeed;
            ReadyToShoot = false;
            Bullets.push(new Projectile(2.0, ShootDirection, PlayerPosition));
        }
    }

    UpdateBadGuys(DeltaTime);
    UpdateProjectiles(DeltaTime);
    UpdatePlayer(DeltaTime);
    UpdateHitTexts(DeltaTime);
    UpdateParticles(DeltaTime);
}

function
DrawFilledRectangle(X, Y, Width, Height, Centered, Color)
{
    var RealX = X;
    var RealY = Y;

    if (Centered)
    {
        RealX -= 0.5 * Width;
        RealY -= 0.5 * Height;
    }

    Context.fillStyle = Color;
    Context.fillRect(RealX, RealY, Width, Height);
}

function
DrawText(X, Y, Str, Color)
{
    Context.font = "20px Georgia";
    Context.fillStyle = Color;
    Context.fillText(Str, X, Y);
}

function
RenderBullets()
{
    for (var i = 0; i < Bullets.length; i++)
    {
        Bullets[i].Render();
    }
}

function
RenderPlayer()
{
    DrawFilledRectangle(PlayerPosition.X, PlayerPosition.Y, 32, 32, true, "#00FF00");
}

function
RenderBadGuys()
{
    for (var i = 0; i < BadGuys.length; i++)
    {
        BadGuys[i].Render();
    }
}

function
RenderParticles()
{
    for (var i = 0; i < MaxParticles; i++)
    {
        Particles[i].Render();
    }
}

function
RenderHitTexts()
{
    for (var i = 0; i < HitTexts.length; i++)
    {
        HitTexts[i].Render();
    }
}

function
Render()
{
    Context.clearRect(0, 0, DefaultCanvasWidth, DefaultCanvasHeight);
    DrawFilledRectangle(0, 0, DefaultCanvasWidth, DefaultCanvasHeight, false, "#6495ED");

    RenderBadGuys();
    RenderBullets();
    RenderPlayer();
    RenderHitTexts();
    RenderParticles();
}

function
GameLoop()
{
    CurrentTime = Date.now();
    var DeltaTime = (CurrentTime - LastTime) / 1000;
    LastTime = CurrentTime;

    Update(DeltaTime);
    Render();

    requestAnimationFrame(GameLoop);
}

function
InitParticles()
{
    for (var i = 0; i < MaxParticles; i++)
    {
        Particles[i] = new Particle(0.0, 0.0, 0.0);
    }
}

function
StartGame()
{
    InitParticles();

    BadGuys.push(new BadGuy(new Vector2(300, 300)));
    document.addEventListener("keydown", KeyDown, false);
    document.addEventListener("keyup", KeyUp, false);
    GameLoop();
}

StartGame();

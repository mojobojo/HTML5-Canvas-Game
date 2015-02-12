/*
    Some reference stuff:

        - https://developers.google.com/speed/articles/optimizing-javascript

    NOTE: Still have not found on the new operator on how garbage collection works 
*/

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

// TODO: I think I want to make Bullets, Badguys, and HitTexts a static sized array
// instead of a dynamic one to reduce the amount of "new" operations

var MaxBullets = 32;
var Bullets = [];

var BulletFireSpeed = 0.5;
var BulletFireSpeedTimer = 0.0;
var ReadyToShoot = false;

var MaxBadGuys = 32;
var BadGuys = [];

var MaxHitTexts = 32;
var HitTexts = [];

var MaxParticles = 256;
var Particles = [];

var Particle = function(X, Y, Direction, Color, InLifespan)
{
    this.Position = new Vector2(X, Y);
    this.Lifespan = InLifespan;
    this.Direction = new Vector2(Direction.X, Direction.Y);
    this.Color = Color;
    this.Speed = 5.0;
    this.HasGravity = false;
}

function
UpdateParticles(DeltaTime)
{
    for (var i = 0; i < MaxParticles; i++)
    {
        if (Particles[i].Lifespan > 0.0)
        {
            Particles[i].Position.X += Particles[i].Direction.X * DeltaTime * Particles[i].Speed;
            Particles[i].Position.Y += Particles[i].Direction.Y * DeltaTime * Particles[i].Speed;
        }

        Particles[i].Lifespan -= DeltaTime;
    }
}

function
RenderParticles()
{
    for (var i = 0; i < MaxParticles; i++)
    {
        if (Particles[i].Lifespan > 0.0)
        {
            DrawFilledRectangle(Particles[i].Position.X, Particles[i].Position.Y, 4, 4, true, Particles[i].Color);
        }
    }
}

function
AddParticle(X, Y, Direction, Color, Lifespan)
{
    // Trying something a little different like I do in C to avoid having
    // to use lists that make memory allocate and unallocate every frame
    for (var i = 0; i < MaxParticles; i++)
    {
        if (Particles[i].Lifespan <= 0.0)
        {
            Particles[i].Position.X = X;
            Particles[i].Position.Y = Y;
            Particles[i].Direction.X = Direction.X;
            Particles[i].Direction.Y = Direction.Y;
            Particles[i].Color = Color;
            Particles[i].Lifespan = Lifespan;
            break;
        }
    }
}

function
AddExplosion(Count, Position, Color, Radius)
{
    for (var i = 0; i < Count; i++)
    {
        var Dir = CircularRandomPlot(Radius);
        var Lifespan = 0.5 - RandomFloat(0.0, 0.5);
        AddParticle(Position.X, Position.Y, Dir, Color, Lifespan);
    }
}

var AnimatedText = function(InPosition, InText)
{
    this.Position = new Vector2(InPosition.X, InPosition.Y);
    this.Text = InText;
    this.Lifespan = 0.5;
    this.Dead = false;
    this.Speed = 1000.0;
    this.YVelocity = 0.0;
}

function
AddHitText(Position, InText)
{
    for (var i = 0; i < MaxHitTexts; i++)
    {
        if (HitTexts[i].Dead)
        {
            HitTexts[i].Position = new Vector2(Position.X, Position.Y);
            HitTexts[i].Text = InText;
            HitTexts[i].Lifespan = 0.5;
            HitTexts[i].Dead = false;
            HitTexts[i].Speed = 1000.0;
            HitTexts[i].YVelocity = 0.0;
            return;
        }
    }
}

function
UpdateHitTexts(DeltaTime)
{
    for (var i = 0; i < MaxHitTexts; i++)
    {
        if (HitTexts[i].Lifespan <= 0.0)
        {
            HitTexts[i].Dead = true;
            continue;
        }

        var YDirection = -1.0 * HitTexts[i].Speed;

        HitTexts[i].Position.Y += 0.5 * YDirection * Math.pow(DeltaTime, 2) + HitTexts[i].YVelocity * DeltaTime;
        HitTexts[i].YVelocity = YDirection * DeltaTime + HitTexts[i].YVelocity;

        HitTexts[i].Lifespan -= DeltaTime;
    }
}

function
RenderHitTexts()
{
    for (var i = 0; i < MaxHitTexts; i++)
    {
        if (!HitTexts[i].Dead)
        {
            DrawText(HitTexts[i].Position.X, HitTexts[i].Position.Y, HitTexts[i].Text, "#FFF000");
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
UpdateProjectiles(DeltaTime)
{
    for (var i = 0; i < MaxBullets; i++)
    {
        Bullets[i].Lifespan -= DeltaTime;

        if (Bullets[i].Lifespan <= 0.0)
        {
            Bullets[i].Dead = true;
        }

        if (Bullets[i].Dead)
        {
            continue;
        }

        if (RandomInt(0, 5) == 0)
        {
            var Dir = new Vector2(
                Bullets[i].Direction.X + RandomFloat(-1.0, 1.0) * 10.0, 
                Bullets[i].Direction.Y + RandomFloat(-1.0, 1.0) * 10.0);
            AddParticle(Bullets[i].Position.X, Bullets[i].Position.Y, Dir, "#0000FF", RandomFloat(0.0, 1.0));
        }

        var FinalPos = new Vector2(0.0, 0.0);
        FinalPos.X = Bullets[i].Direction.X;
        FinalPos.Y = Bullets[i].Direction.Y;

        FinalPos = Vector2_MultiplyByScalar(FinalPos, Bullets[i].Speed * DeltaTime);
        Bullets[i].Position = Vector2_Add(Bullets[i].Position, FinalPos);

        Bullets[i].Dead = false;  
    }
}

function
RenderBullets()
{
    for (var i = 0; i < MaxBullets; i++)
    {
        if (Bullets[i].Lifespan <= 0.0 || Bullets[i].Dead)
        {
            continue;
        }

        DrawFilledRectangle(
            Bullets[i].Position.X, Bullets[i].Position.Y, 
            Bullets[i].CollisionRect.Width, Bullets[i].CollisionRect.Height, true, "#0000FF");
    }
}

function
AddBullet(Lifespan, ShootDirection, PlayerPosition)
{
    Bullets.push(new Projectile(5.0, ShootDirection, PlayerPosition));
    for (var i = 0; i < MaxBullets; i++)
    {
        if (Bullets[i].Dead)
        {
            Bullets[i].Lifespan = Lifespan;
            Bullets[i].Direction = new Vector2(ShootDirection.X, ShootDirection.Y);
            Bullets[i].Position = new Vector2(PlayerPosition.X, PlayerPosition.Y);
            Bullets[i].Dead = false;
            break;
        }
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
UpdateBadGuys(DeltaTime)
{
    for (var i = 0; i < MaxBadGuys; i++)
    {
        if (BadGuys[i].Dead)
        {
            continue;
        }

        var LastPosition = new Vector2(PlayerPosition.X, PlayerPosition.Y);
        var Bleh = new Vector2(PlayerPosition.X, PlayerPosition.Y);

        Bleh.X = Bleh.X - BadGuys[i].Position.X;
        Bleh.Y = Bleh.Y - BadGuys[i].Position.Y;

        var BlehLen = Vector2_Length(Bleh);

        if (BlehLen <= 10.0)
        {
            continue;
        }
        
        var Normal = Vector2_Normalize(Bleh);

        BadGuys[i].Direction.X = Normal.X;
        BadGuys[i].Direction.Y = Normal.Y;

        BadGuys[i].Direction = Vector2_MultiplyByScalar(BadGuys[i].Direction, BadGuys[i].Speed);

        // TODO: Really need to get vector math working
        BadGuys[i].Direction.X += 5.0 * -BadGuys[i].Velocity.X;
        BadGuys[i].Direction.Y += 5.0 * -BadGuys[i].Velocity.Y;

        BadGuys[i].Position.X += 0.5 * BadGuys[i].Direction.X * Math.pow(DeltaTime, 2) + BadGuys[i].Velocity.X * DeltaTime;
        BadGuys[i].Position.Y += 0.5 * BadGuys[i].Direction.Y * Math.pow(DeltaTime, 2) + BadGuys[i].Velocity.Y * DeltaTime;
        BadGuys[i].Velocity.X = BadGuys[i].Direction.X * DeltaTime + BadGuys[i].Velocity.X;
        BadGuys[i].Velocity.Y = BadGuys[i].Direction.Y * DeltaTime + BadGuys[i].Velocity.Y;

        if (RandomFloat(0.0, 1.0) > 0.5)
        {
            var Dir = new Vector2(RandomFloat(-5.0, 5.0), 10.0);
            AddParticle(BadGuys[i].Position.X, BadGuys[i].Position.Y, Dir, "#FF0000", RandomFloat(0.0, 1.0));
        }

        // Bullet collisions
        for (var j = 0; j < MaxBullets; j++)
        {
            if (Bullets[j].Dead)
            {
                continue;
            }

            var ColA = BadGuys[i].GetCollision();
            var ColB = Bullets[j].GetCollision();

            if (DoesRectangleIntersectAnother(ColA, ColB))
            {
                Bullets[j].Lifespan = 0.0;
                Bullets[j].Dead = true;

                BadGuys[i].Velocity.X = -BadGuys[i].Velocity.X;
                BadGuys[i].Velocity.Y = -BadGuys[i].Velocity.Y;

                var DamageDealt = 0.1;
                BadGuys[i].Health -= DamageDealt;

                AddHitText(BadGuys[i].Position, DamageDealt.toString());

                AddExplosion(16, BadGuys[i].Position, "#0000FF", 10.0);

                break;
            }
        }

        if (BadGuys[i].Health <= 0.0 && !BadGuys[i].Dead)
        {
            BadGuys[i].Dead = true;
            AddExplosion(32, BadGuys[i].Position, "#FF0000", 100.0);
            AddBadGuy(new Vector2(RandomInt(0, DefaultCanvasWidth), RandomInt(0, DefaultCanvasHeight)));
        }
    }
}

function
RenderBadGuys()
{
    for (var i = 0; i < MaxBadGuys; i++)
    {
        if (BadGuys[i].Dead)
        {
            continue;
        }

        DrawFilledRectangle(
            BadGuys[i].Position.X, BadGuys[i].Position.Y, 
            BadGuys[i].CollisionRect.Width, BadGuys[i].CollisionRect.Height, true, "#FF0000");    
    }
}

function
AddBadGuy(Position)
{
    for (var i = 0; i < MaxBadGuys; i++)
    {
        if (BadGuys[i].Dead)
        {
            BadGuys[i].Dead = false;
            BadGuys[i].Position = new Vector2(Position.X, Position.Y);
            BadGuys[i].Health = 1.0;
            break;
        }
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
    return Math.random() * (Max - Min) + Min;
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
UpdatePlayer(DeltaTime)
{
    PlayerDirection = Vector2_MultiplyByScalar(PlayerDirection, PlayerSpeed);

    // TODO: Really need to get vector math working
    PlayerDirection.X += 5.0 * -PlayerVelocity.X;
    PlayerDirection.Y += 5.0 * -PlayerVelocity.Y;

    PlayerPosition.X += 0.5 * PlayerDirection.X * Math.pow(DeltaTime, 2) + PlayerVelocity.X * DeltaTime;
    PlayerPosition.Y += 0.5 * PlayerDirection.Y * Math.pow(DeltaTime, 2) + PlayerVelocity.Y * DeltaTime;
    PlayerVelocity.X = PlayerDirection.X * DeltaTime + PlayerVelocity.X;
    PlayerVelocity.Y = PlayerDirection.Y * DeltaTime + PlayerVelocity.Y;

    if (RandomFloat(0.0, 1.0) > 0.5)
    {
        var Dir = new Vector2(RandomFloat(-5.0, 5.0), 10.0);
        AddParticle(PlayerPosition.X, PlayerPosition.Y, Dir, "#00FF00", RandomFloat(0.0, 1.0));
    }
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
RenderPlayer()
{
    DrawFilledRectangle(PlayerPosition.X, PlayerPosition.Y, 32, 32, true, "#00FF00");
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
            AddBullet(5.0, ShootDirection, PlayerPosition);
        }
        else if (Keys[KEY_DOWN] == true)
        {
            ShootDirection.X = 0.0;
            ShootDirection.Y = 1.0;
            ShootingProjectile = true;
            BulletFireSpeedTimer = BulletFireSpeed;
            ReadyToShoot = false;
            AddBullet(5.0, ShootDirection, PlayerPosition);
        }
        else if (Keys[KEY_LEFT] == true)
        {
            ShootDirection.X = -1.0;
            ShootDirection.Y = 0.0;
            ShootingProjectile = true;
            BulletFireSpeedTimer = BulletFireSpeed;
            ReadyToShoot = false;
            AddBullet(5.0, ShootDirection, PlayerPosition);
        }
        else if (Keys[KEY_RIGHT] == true)
        {
            ShootDirection.X = 1.0;
            ShootDirection.Y = 0.0;
            ShootingProjectile = true;
            BulletFireSpeedTimer = BulletFireSpeed;
            ReadyToShoot = false;
            AddBullet(5.0, ShootDirection, PlayerPosition);
        }
    }

    BulletFireSpeedTimer -= DeltaTime;

    if (BulletFireSpeedTimer <= 0.0)
    {
        ReadyToShoot = true;
    }

    UpdateBadGuys(DeltaTime);
    UpdateProjectiles(DeltaTime);
    UpdatePlayer(DeltaTime);
    UpdateHitTexts(DeltaTime);
    UpdateParticles(DeltaTime);
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
InitEverything()
{
    // Setup particles
    for (var i = 0; i < MaxParticles; i++)
    {
        Particles[i] = new Particle(0.0, 0.0, new Vector2(0.0, 0.0), "#000000", 0.0);
    }

    for (var i = 0; i < MaxHitTexts; i++)
    {
        HitTexts[i] = new AnimatedText(new Vector2(0.0, 0.0), "DefaultText");
    }

    for (var i = 0; i < MaxBadGuys; i++)
    {
        BadGuys[i] = new BadGuy(new Vector2(0.0, 0.0));
        BadGuys[i].Health = 0.0;
        BadGuys[i].Dead = true;
    }

    for (var i = 0; i < MaxBullets; i++)
    {
        Bullets[i] = new Projectile(0.0, new Vector2(0.0, 0.0), new Vector2(0.0, 0.0));
        Bullets[i].Dead = true;
    }
}

function
StartGame()
{
    InitEverything();
    
    AddBadGuy(new Vector2(RandomInt(0, DefaultCanvasWidth), RandomInt(0, DefaultCanvasHeight)));

    document.addEventListener("keydown", KeyDown, false);
    document.addEventListener("keyup", KeyUp, false);
    GameLoop();
}

StartGame();

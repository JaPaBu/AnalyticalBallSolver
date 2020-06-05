class Ball {
  constructor(p, v, R, color) {
    this.p = p;
    this.v = v;
    this.R = R;
    this.color = color;

    //Mass is given by radius
    this.M = Math.PI * R * R;
  }

  draw() {
    fill(this.color);
    circle(this.p.x, this.p.y, 2 * this.R);
  }

  collisionTime(o) {
    const R = this.R + o.R;
    const v = p5.Vector.sub(this.v, o.v);
    const p = p5.Vector.sub(this.p, o.p);

    const vSq = v.magSq();
    const pSq = p.magSq();
    const RSq = R * R;

    const a = v.dot(p) / vSq;
    const b = (pSq - RSq) / vSq;
    const c = a * a - b;

    //No solution
    if (c < 0) return null;

    const sqrtC = Math.sqrt(c);

    const t0 = -a - sqrtC;
    if (t0 >= ZERO) return Math.max(t0, 0);

    const t1 = -a + sqrtC;
    if (t1 >= ZERO) return Math.max(t1, 0);

    //t must not be negative
    return null;
  }

  zeroTCollisionCheck(o) {
    const v = p5.Vector.sub(this.v, o.v);
    const p = p5.Vector.sub(this.p, o.p);

    //ddtDSq/2 with t = 0
    const a = 2 * v.dot(p);
    return a < 0;
  }

  zeroTBoundaryCollisionCheck(b) {
    if (b === "LEFT") return this.v.x < 0;
    else if (b === "RIGHT") return this.v.x > 0;
    else if (b === "TOP") return this.v.y < 0;
    else if (b === "BOTTOM") return this.v.y > 0;
    else throw new Error("INVALID COLLISION!");
  }
}

const ZERO = -1e-10;

const balls = [];
let slider = null;

let WIDTH = null;
let HEIGHT = null;

function setup() {
  WIDTH = windowWidth - 20;
  HEIGHT = windowHeight - 50;

  slider = createSlider(0.01, 5, 1, 0.01);

  createCanvas(WIDTH, HEIGHT);

  // balls.push(new Ball(createVector(300, 500), createVector(+80, 0), 20, "blue"));
  // balls.push(new Ball(createVector(500, 500), createVector(0, 0), 10, "red"));
  // balls.push(new Ball(createVector(500, 500), createVector(0, 0), 10, "red"));
  // balls.push(new Ball(createVector(700, 500), createVector(-80, 0), 20, "green"));
  // balls.push(new Ball(createVector(500, 300), createVector(0, 80), 20, "green"));
  // balls.push(new Ball(createVector(500, 700), createVector(0, -80), 20, "orange"));
  // balls.push(new Ball(createVector(50, 50), createVector(-50, -50), 40, "black"));

  function r(min, max) {
    return Math.random() * (max - min) + min;
  }

  for (let i = 0; i < 100; i++) {
    balls.push(new Ball(createVector(r(100, 2300), r(100, 1500)), createVector(r(-200, 200), r(-200, 200)), r(10, 30), r(0, 255)));
  }
  balls.push(new Ball(createVector(r(100, 2300), r(100, 1500)), createVector(-2000, 2000), 200, r(0, 255)));
}

let previousSeconds = 0;
function draw() {
  const seconds = millis() / 1000.0;
  const dt = seconds - previousSeconds;
  // const dt = 0.016;
  previousSeconds = seconds;
  simulate(dt * slider.value());

  background("white");
  for (let i = 0; i < balls.length; i++) {
    balls[i].draw();
  }
}

function integrate(dt) {
  for (let i = 0; i < balls.length; i++) {
    balls[i].p.add(p5.Vector.mult(balls[i].v, dt));
  }
}

function vAfterElasticCollision(x1, x2, v1, v2, m1, m2) {
  //https://en.wikipedia.org/wiki/Elastic_collision#Two-dimensional

  const x = p5.Vector.sub(x1, x2);
  const v = p5.Vector.sub(v1, v2);

  const xSq = x.magSq();

  const a = 2 * m2 / (m1 + m2) * v.dot(x) / xSq;
  const b = p5.Vector.mult(x, a);

  return p5.Vector.sub(v1, b);
}

function collide(c) {
  if (c.n === "LEFT" || c.n === "RIGHT") {
    c.a.v.x *= -1;
  } else if (c.n === "TOP" || c.n === "BOTTOM") {
    c.a.v.y *= -1;
  } else if (c.n === "BALL") {
    const a = c.a;
    const b = c.b;

    const va = vAfterElasticCollision(a.p, b.p, a.v, b.v, a.M, b.M);
    const vb = vAfterElasticCollision(b.p, a.p, b.v, a.v, b.M, a.M);

    a.v = va;
    b.v = vb;
  } else {
    throw new Error("INVALID COLLISION!");
  }
}

function boundaryCollision(p, v, b) {
  const t = (b - p) / v;
  if (t < ZERO) return null;
  return t;
}

function simulate(dt) {
  let collisionTime = Infinity;
  let collision = null;

  for (let i = 0; i < balls.length; i++) {
    const a = balls[i];

    const boundaryCollisions = [
      { a, t: boundaryCollision(a.p.x, a.v.x, a.R), n: "LEFT" },
      { a, t: boundaryCollision(a.p.x, a.v.x, WIDTH - a.R), n: "RIGHT" },
      { a, t: boundaryCollision(a.p.y, a.v.y, a.R), n: "TOP" },
      { a, t: boundaryCollision(a.p.y, a.v.y, HEIGHT - a.R), n: "BOTTOM" },
    ];

    for (let i = 0; i < boundaryCollisions.length; i++) {
      const c = boundaryCollisions[i];

      if (c.t === null) continue;
      if (c.t > dt) continue;
      if (c.t >= collisionTime) continue;
      if (!c.a.zeroTBoundaryCollisionCheck(c.n)) continue;

      collision = c;
      collisionTime = c.t;
    }

    for (let j = i + 1; j < balls.length; j++) {
      const b = balls[j];
      const t = a.collisionTime(b);

      //If there is no solution ignore it
      if (t === null) continue;

      //If the collision happens after the current time step ignore it
      if (t > dt) continue;

      //If the collision happens  or at the other collision ignore it
      if (t >= collisionTime) continue;

      //If not zeroTCollisionCheck continue
      if (!a.zeroTCollisionCheck(b)) continue;

      //Set the collision
      collision = { a, b, n: "BALL" };
      collisionTime = t;
    }
  }

  //If there are no collisions inside the current time step just integrate the whole step
  if (!collision) {
    integrate(dt);
    return;
  }

  //Integrate up until the collision time
  integrate(collisionTime);
  dt -= collisionTime;

  //Update the system
  collide(collision);

  //Simulate the rest
  simulate(dt);
}
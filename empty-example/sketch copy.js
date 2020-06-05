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
    if (t0 >= 0) return t0;

    const t1 = -a + sqrtC;
    if (t1 >= 0) return t1;

    //t must not be negative
    return null;
  }

  zeroDtCollisionCheck(o) {
    const v = p5.Vector.sub(this.v, o.v);
    const p = p5.Vector.sub(this.p, o.p);

    //ddtDSq/2 with t = 0
    const a = 2 * v.dot(p);
    return a < 0;
  }
}

const balls = [];
function setup() {
  createCanvas(windowWidth, windowHeight);

  balls.push(new Ball(createVector(300, 500), createVector(+80, 0), 20, "blue"));
  balls.push(new Ball(createVector(500, 500), createVector(1, 0), 20, "red"));
  balls.push(new Ball(createVector(700, 500), createVector(-80, 0), 20, "green"));
}

let previousSeconds = 0;
function draw() {
  const seconds = millis() / 1000.0;
  const dt = seconds - previousSeconds;
  previousSeconds = seconds;
  simulate(dt);

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

function collide(a, b) {
  const va = vAfterElasticCollision(a.p, b.p, a.v, b.v, a.M, b.M);
  const vb = vAfterElasticCollision(b.p, a.p, b.v, a.v, b.M, a.M);

  a.v = va;
  b.v = vb;
}

function simulate(dt) {
  let collisionTime = Infinity;
  const collisions = [];

  function checkForCollisions(dt) {
    collisionTime = Infinity;
    collisions.length = 0;

    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const b = balls[j];
        const t = a.collisionTime(b);

        //If there is no solution ignore it
        if (t === null) continue;

        //If dt === 0 perform zeroDtCollisionCheck
        if(dt === 0 && !a.zeroDtCollisionCheck(b)) continue;

        //If the collision happens at the current time step it has already collided
        //Except for when dt === 0
        if (dt !== 0 && t === 0) continue;

        //If the collision happens after the current time step ignore it
        if (t > dt) continue;

        //If the collision happens after another collision ignore it
        if (t > collisionTime) continue;

        //If the collision happens before the current collision ignore everything after it
        if (t < collisionTime) {
          collisions.length = 0;
          collisionTime = t;
        }

        //Add the collision
        collisions.push({ a, b });
      }
    }
  }

  checkForCollisions(dt);

  //If there are no collisions inside the current time step just integrate the whole step
  if (collisions.length <= 0) {
    integrate(dt);
    return;
  }

  //Integrate up until the collision time
  integrate(collisionTime);
  dt -= collisionTime;

  //Update the system
  while (collisions.length > 0) {
    for (let i = 0; i < collisions.length; i++) {
      collide(collisions[i].a, collisions[i].b);
    }

    checkForCollisions(0);
  }

  //Simulate the rest
  simulate(dt);
}
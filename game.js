'use strict';

class Vector {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  plus(vector) {
    if (!(vector instanceof Vector)) {
      throw new Error('Можно прибавлять к вектору только вектор типа Vector');
    }
    return new Vector((this.x + vector.x), (this.y + vector.y));
  }

  times(multiplier) {
    return new Vector(this.x * multiplier, this.y * multiplier);
  }
}

class Actor {
  constructor(pos = new Vector(0, 0), size = new Vector(1, 1), speed = new Vector(0, 0)) {
    if (!(pos instanceof Vector) || !(size instanceof Vector) || !(speed instanceof Vector)) {
      throw new Error('В аргументы объекта типа Actor можно передать только объекты типа Vector');
    }
    this.pos = pos;
    this.size = size;
    this.speed = speed;
  }

  get left() {
    return this.pos.x;
  }

  get right() {
    return this.pos.x + this.size.x;
  }

  get top() {
    return this.pos.y;
  }

  get bottom() {
    return this.pos.y + this.size.y;
  }

  get type() {
    return 'actor';
  }

  act() {
  }

  isIntersect(actor) {
    if (!(actor instanceof Actor)) {
      throw new Error('Необходимо передать в аргумент объект типа Actor');
    }
    if (actor === this) {
      return false;
    }

    return !(actor.left >= this.right || this.left >= actor.right ||
      actor.top >= this.bottom || this.top >= actor.bottom);
  }
}

class Level {
  constructor() {
    this.grid = arguments[0];
    this.actors = (arguments[1]) ? arguments[1].filter(item => item instanceof Actor) : [];
    this.player = this.actors.find(item => item.type === 'player');
    this.height = (typeof this.grid !== 'undefined') ? this.grid.length : 0;
    this.width = (this.height > 0 && this.grid[0] instanceof Array) ?
      (this.grid.reduce((max, current) => (max.length > current.length) ? max.length : current.length)) : 0;
    this.status = null;
    this.finishDelay = 1;
  }

  isFinished() {
    return this.status !== null && this.finishDelay < 0;
  }

  actorAt(actor) {
    if (!(actor) || !(actor instanceof Actor)) {
      throw new Error('Необходимо передать в аргумент объект типа Actor');
    }
    let result = undefined;
    this.actors.forEach(thisActor => {
      if (thisActor.isIntersect(actor)) {
        result = thisActor;
      }
    });
    return result;
  }

  obstacleAt(pos, size) {
    if (!(pos instanceof Vector) || !(size instanceof Vector)) {
      throw new Error('Необходимо передать в аргументы объекты типа Vector');
    }

    let left = Math.floor(pos.x);
    let right = Math.ceil(pos.x + size.x);
    let top = Math.floor(pos.y);
    let bottom = Math.ceil(pos.y + size.y);

    if (left < 0 || right > this.width || top < 0) {
      return 'wall';
    }

    if (bottom > this.height) {
      return 'lava';
    }

    for (let x = left; x < right; x++) {
      for (let y = top; y < bottom; y++) {
        if (this.grid[y][x]) {
          return this.grid[y][x];
        }
      }
    }
  }

  removeActor(actor) {
    let position = this.actors.indexOf(actor);
    if (position !== -1) {
      this.actors.splice(position, 1);
    }
  }

  noMoreActors(type) {
    const noMoreActors = this.actors.find(item => item.type === type);
    return typeof noMoreActors === 'undefined';
  }

  playerTouched(type, actor = undefined) {
    if (this.status === null) {
      if (type === 'lava' || type === 'fireball') {
        this.status = 'lost';
      } else if (type === 'coin') {
        this.removeActor(actor);
        if (this.noMoreActors('coin')) {
          this.status = 'won';
        }
      }
    }
  }
}

class LevelParser {
  constructor(actorsDict) {
    this.actorsDict = actorsDict;
  }

  actorFromSymbol() {
    return (arguments[0]) ? this.actorsDict[arguments[0]] : undefined;
  }

  obstacleFromSymbol(char) {
    if (char === 'x') return 'wall';
    if (char === '!') return 'lava';
  }

  createGrid(plan) {
    const result = [];

    for (let line of plan) {
      let interim = [];
      for (let pos of line.split('')) {
        interim.push(this.obstacleFromSymbol(pos));
      }
      result.push(interim);
    }
    return result;
  }

  createActors(plan) {
    const result = [];

    if (this.actorsDict) {
      for (let y = 0; y < plan.length; y++) {
        for (let x = 0; x < plan[y].length; x++) {
          if (plan[y][x] in this.actorsDict &&
            typeof this.actorsDict[plan[y][x]] === 'function' &&
            (this.actorsDict[plan[y][x]].prototype === Actor.prototype ||
              this.actorsDict[plan[y][x]].prototype.__proto__ === Actor.prototype)) {
            result.push(new this.actorsDict[plan[y][x]](new Vector(x, y)));
          }
        }
      }
    }
    return result;
  }

  parse(plan) {
    return new Level(this.createGrid(plan), this.createActors(plan));
  }
}

class Fireball extends Actor {
  constructor(pos = new Vector(), speed = new Vector()) {
    super(pos, new Vector(1, 1), speed);
  }

  get type() {
    return 'fireball';
  }

  getNextPosition(t = 1) {
    return new Vector((this.pos.x + this.speed.x * t), (this.pos.y + this.speed.y * t));
  }

  handleObstacle() {
    this.speed.x *= -1;
    this.speed.y *= -1;
  }

  act(t, level) {
    let nextPosition = this.getNextPosition(t);

    if (level.obstacleAt(nextPosition, this.size) !== undefined) {
      this.handleObstacle();
    } else {
      this.pos = nextPosition;
    }
  }
}

class HorizontalFireball extends Fireball {
  constructor(pos = new Vector()) {
    super(pos, new Vector(2, 0));
  }
}

class VerticalFireball extends Fireball {
  constructor(pos = new Vector()) {
    super(pos, new Vector(0, 2));
  }
}

class FireRain extends Fireball {
  constructor(pos = new Vector()) {
    super(pos, new Vector(0, 3));
    this.startPos = pos;
  }

  handleObstacle() {
    this.pos = this.startPos;
  }
}

class Coin extends Actor {
  constructor(pos = new Vector()) {
    pos = pos.plus(new Vector(0.2, 0.1));
    super(pos, new Vector(0.6, 0.6));
    this.startPos = pos;
    this.springSpeed = 8;
    this.springDist = 0.07;
    this.spring = Math.random() * 2 * Math.PI;
  }

  get type() {
    return 'coin';
  }

  updateSpring(t = 1) {
    this.spring += this.springSpeed * t;
  }

  getSpringVector() {
    return new Vector(0, Math.sin(this.spring) * this.springDist);
  }

  getNextPosition(t = 1) {
    this.updateSpring(t);
    return this.startPos.plus(this.getSpringVector());
  }

  act(t) {
    this.pos = this.getNextPosition(t);
  }
}

class Player extends Actor {
  constructor(pos = new Vector()) {
    pos = pos.plus(new Vector(0, -0.5));
    super(pos, new Vector(0.8, 1.5));
  }

  get type() {
    return 'player';
  }
}

const actorDict = {
  '@': Player,
  'v': FireRain,
  '=': HorizontalFireball,
  '|': VerticalFireball,
  'o': Coin
};

const parser = new LevelParser(actorDict);

loadLevels()
  .then(schemas => runGame(JSON.parse(schemas), parser, DOMDisplay))
  .then(() => alert('Поздравляем! Вы победили!'))
  .catch(err => alert(err));

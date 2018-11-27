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

    return (actor.left < this.right && this.left < actor.right &&
      actor.top < this.bottom && this.top < actor.bottom);
  }
}

class Level {
  constructor(grid = [], actors = []) {
    this.grid = grid.slice();
    this.actors = actors.slice();
    this.player = this.actors.find(item => item.type === 'player');
    this.height = this.grid.length;
    this.width = Math.max(0, ...this.grid.map(line => line.length));
    this.status = null;
    this.finishDelay = 1;
  }

  isFinished() {
    return this.status !== null && this.finishDelay < 0;
  }

  actorAt(actor) {
    if (!(actor instanceof Actor)) {
      throw new Error('Необходимо передать в аргумент объект типа Actor');
    }

    return this.actors.find(thisActor => thisActor.isIntersect(actor));
  }

  obstacleAt(pos, size) {
    if (!(pos instanceof Vector) || !(size instanceof Vector)) {
      throw new Error('Необходимо передать в аргументы объекты типа Vector');
    }

    const left = Math.floor(pos.x);
    const right = Math.ceil(pos.x + size.x);
    const top = Math.floor(pos.y);
    const bottom = Math.ceil(pos.y + size.y);

    if (left < 0 || right > this.width || top < 0) {
      return 'wall';
    }

    if (bottom > this.height) {
      return 'lava';
    }

    for (let x = left; x < right; x++) {
      for (let y = top; y < bottom; y++) {
        const cell = this.grid[y][x];

        if (cell) {
          return cell;
        }
      }
    }
  }

  removeActor(actor) {
    const position = this.actors.indexOf(actor);

    if (position !== -1) {
      this.actors.splice(position, 1);
    }
  }

  noMoreActors(type) {
    return !this.actors.some(actor => actor.type === type);
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
  constructor(actorsDict = {}) {
    this.actorsDict = Object.assign({}, actorsDict);
  }

  actorFromSymbol(char) {
    return char ? this.actorsDict[char] : undefined;
  }

  obstacleFromSymbol(char) {
    if (char === 'x') {
      return 'wall';
    }

    if (char === '!') {
      return 'lava';
    }
  }

  createGrid(plan) {
    return plan.map(line => line.split('').map(pos => this.obstacleFromSymbol(pos)));
  }

  createActors(plan) {
    const result = [];

    for (let y = 0; y < plan.length; y++) {
      for (let x = 0; x < plan[y].length; x++) {
        const actorClass = this.actorFromSymbol(plan[y][x]);

        if (typeof actorClass === 'function') {
          const actor = new actorClass(new Vector(x, y));

          if (actor instanceof Actor) {
            result.push(actor);
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
  constructor(pos = new Vector(0, 0), speed = new Vector(0, 0)) {
    super(pos, new Vector(1, 1), speed);
  }

  get type() {
    return 'fireball';
  }

  getNextPosition(t = 1) {
    return this.pos.plus(this.speed.times(t));
  }

  handleObstacle() {
    this.speed = this.speed.times(-1);
  }

  act(t, level) {
    const nextPosition = this.getNextPosition(t);

    if (level.obstacleAt(nextPosition, this.size)) {
      this.handleObstacle();
    } else {
      this.pos = nextPosition;
    }
  }
}

class HorizontalFireball extends Fireball {
  constructor(pos = new Vector(0, 0)) {
    super(pos, new Vector(2, 0));
  }
}

class VerticalFireball extends Fireball {
  constructor(pos = new Vector(0, 0)) {
    super(pos, new Vector(0, 2));
  }
}

class FireRain extends Fireball {
  constructor(pos = new Vector(0, 0)) {
    super(pos, new Vector(0, 3));
    this.startPos = pos;
  }

  handleObstacle() {
    this.pos = this.startPos;
  }
}

class Coin extends Actor {
  constructor(pos = new Vector(0, 0)) {
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
  constructor(pos = new Vector(0, 0)) {
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

/*
 * Walkway.js
 *
 * Copyright 2014, Connor Atherton - http://connoratherton.com/
 * Released under the MIT Licence
 * http://opensource.org/licenses/MIT
 *
 * Github:  http://github.com/ConnorAtherton/Walkway
 */

// Export Walkway depending on environment (AMD, CommonJS or Browser global)
;(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(factory);
  } else if (typeof exports === 'object') {
    // CommonJS
    module.exports = factory();
  } else {
    // Browser globals
    root.Walkway = factory();
  }
}(this, function factory(exports) {
  'use strict';

  /*
   * Shim for requestAnimationFrame on older browsers
   */

  var lastTime = 0;
  window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
  window.cancelAnimationFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame;

  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function(callback, element) {
      var currTime = new Date().getTime();
      var timeToCall = Math.max(0, 16 - (currTime - lastTime));
      var id = window.setTimeout(function() {
        callback(currTime + timeToCall);
      }, timeToCall);

      lastTime = currTime + timeToCall;
      return id;
    };
  }

  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = function(id) {
      clearTimeout(id);
    };
  }

  /*
   * Easing Functions - inspired from http://gizma.com/easing/
   * only considering the t value for the range [0, 1] => [0, 1]
   *
   * Taken from https://gist.github.com/gre/1650294
   */

  var EasingFunctions = {
    // no easing, no acceleration
    linear: function (t) { return t; },
    // accelerating from zero velocity
    easeInQuad: function (t) { return t*t; },
      // decelerating to zero velocity
    easeOutQuad: function (t) { return t*(2-t); },
      // acceleration until halfway, then deceleration
    easeInOutQuad: function (t) { return t<0.5 ? 2*t*t : -1+(4-2*t)*t; },
      // accelerating from zero velocity
    easeInCubic: function (t) { return t*t*t; },
      // decelerating to zero velocity
    easeOutCubic: function (t) { return (--t)*t*t+1; },
      // acceleration until halfway, then deceleration
    easeInOutCubic: function (t) { return t<0.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1; },
      // accelerating from zero velocity
    easeInQuart: function (t) { return t*t*t*t; },
      // decelerating to zero velocity
    easeOutQuart: function (t) { return 1-(--t)*t*t*t; },
      // acceleration until halfway, then deceleration
    easeInOutQuart: function (t) { return t<0.5 ? 8*t*t*t*t : 1-8*(--t)*t*t*t; },
      // accelerating from zero velocity
    easeInQuint: function (t) { return t*t*t*t*t; },
      // decelerating to zero velocity
    easeOutQuint: function (t) { return 1+(--t)*t*t*t*t; },
      // acceleration until halfway, then deceleration
    easeInOutQuint: function (t) { return t<0.5 ? 16*t*t*t*t*t : 1+16*(--t)*t*t*t*t; }
  };

  /*
   * Creates a selector used to select all element to animate
   * Currently only supports *path*, *line*, and *polyline* svg elements
   *
   * @param {string} selector The selector of the parent element
   * @returns {string} the complete selector
   * @private
   */

  function _createSelector(selector) {
    var supported = ['path', 'line', 'polyline'];
    var newSelector = supported.reduce(function(prev, curr){
      return prev + selector + ' ' + curr + ', ';
    }, '');
    // chop the last , from the string
    return newSelector.slice(0, -2);
  }

  /**
   * Component constructor function
   *
   * opts.selector is the only mandatory param and can be passed in alone
   * as a string
   *
   * @param {object} opts the configuration objects for the instance.
   * @returns {component}
   */

  class Component(opts = { duration: 500, easing: 'easeInOutCubic' }) {
    constructor() {
      if (!(this instanceof Component))
        return new Component(opts);

      if (typeof opts === 'string')
        opts = { selector: opts };

      if (!opts.selector)
        return this.error('A selector needs to be specified');

      this.opts = opts
      this.selector = opts.selector
      this.duration = opts.duration
      this.easing = EasingFunctions[opts.easing]

      // Store all the components we use during the animation
      this.components = Walkway._fetchComponents(this.selector)

      // Clear the styles to the beginning
      // TODO: should this be an option?
      this.reset()

      // Animation id tracked from the browser
      this._id = false

      // Length of the element
      this._length = length()
    }

    start(){
      return this.opts.trigger
        ? root.document.addEventListener(trigger, => this.draw())
        : this.draw()
    }

    draw() {
      let _draw = => {
        let counter = this.paths.length;

        if (counter === 0) {
          if (callback && typeof(callback) === 'function') {
            callback();
          }
          return window.cancelAnimationFrame(this.id);
        }

        while (counter--) {
          let path = this.paths[counter];
          let done = path.update();

          if (done)
            this.paths.splice(counter, 1);
        }

        this.id = window.requestAnimationFrame(this.draw.bind(this, callback));
      }

      return this.opts.delay
        ? root.setTimeout(() => _draw(), opts.delay))
        :_draw();
    }

    update() {
      if (!this.animationStarted) {
        this.animationStart = Date.now();
        this.animationStarted = true;
      }

      let progress = this.easing((Date.now() - this.animationStart) / this.duration);
      let value = Math.ceil(this.length * (1 - progress));

      // actually draw
      this.el.style.strokeDashoffset = value < 0 ? 0 : Math.abs(value);

      // This might not work if the easing function returns values
      // outside of the range [0, 1]
      return progress >= 1 ? true : false;
    }

    complete() {
      // Can we just delete this value instead of setting to 0?
      this.components(component => {
        component.el.style.strokeDasharray = 0
        component.el.style.strokeDashoffset = 0
      })
    }

    reset() {
      this.components(component => {
        component.el.style.strokeDasharray = `${component._length} ${component._length}`;
        component.el.style.strokeDashoffset = component._length;
      })
    }
  }

  /**
   * Walkway singleton functions
   */
  Walkway._animations = [];

  Walkway.track = (function() {
    let id = 0
  })()

  Walkway.flush = function() {
    this._animations = []
  }

  Walkway.completeAll = function() {
    this._animations(animation => {
      animation.component.complete()
    })

    this.flush()
  }

  Walkway.resetAll = function() {
    this._animations(animation => {
      animation.component.reset()
    })

    this.flush()
  }

  Walkway.draw = function() {
    this._animations(animation => {
      animation.component.draw()
    })
  }

  Walkway._createSelector = (() => {
    const supported = ['path', 'line', 'polyline']

    return selector => {
      let newSelector = supported.reduce((prev, curr) => {
        return prev + selector + ' ' + curr + ', ';
      }, '');
      // chop the last , from the string
      return newSelector.slice(0, -2);
    }
  })()

  /*
   * Uses a pre-build selector to find and store elements to animate
   *
   * @returns {array<Component>}
   */

  Walkway.prototype.getPaths = function() {
    var self = this;
    var selector = _createSelector(this.selector);
    var els = document.querySelectorAll(selector);
    els = Array.prototype.slice.call(els);

    return els.map(function(el) {
      if(el.tagName === 'path') {
        return new Path(el, self.duration, self.easing);
      } else if (el.tagName === 'line') {
        return new Line(el, self.duration, self.easing);
      } else if(el.tagName === 'polyline'){
        return new Polyline(el, self.duration, self.easing);
      }
    });
  };

  class Line extends Component {
    constructor() { super() }

    length() {
      let x1 = line.getAttribute('x1');
      let x2 = line.getAttribute('x2');
      let y1 = line.getAttribute('y1');
      let y2 = line.getAttribute('y2');

      return Math.sqrt(Math.pow((x1 - x2), 2) + Math.pow((y1 - y2), 2));
    }
  }

  class Path extends Component {
    constructor() { super() }

    // We can use a native function for this
    length() { return this.el.getTotalLength() }
  }

  class Polyline extends Component {
    constructor() { super() }

    // We can use a native function for this
    length() {
      var dist = 0;
      var x1, x2, y1, y2;

      for (let i = 1; i < this.el.points.numberOfItems; i++) {
        x1 = polyline.points.getItem(i - 1) .x;
        x2 = polyline.points.getItem(i).x;
        y1 = polyline.points.getItem(i - 1) .y;
        y2 = polyline.points.getItem(i).y;

        dist += Math.sqrt(Math.pow((x1 - x2), 2) + Math.pow((y1 - y2), 2));
      }

      return dist;
    }
  }

  /**
   * Complete or reset all animations when the page loses focus.
   * Fixes https://github.com/ConnorAtherton/walkway/issues/8
   */
  root.document.addEventListener('visibilitychange', e => {
    if (root.document.hidden)
      Walkway.completeAll()
  })

  return Walkway;
}));

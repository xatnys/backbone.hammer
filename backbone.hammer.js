(function(root, factory) {
  // Set up Backbone appropriately for the environment.
  if (typeof define === 'function' && define.amd) {
    // AMD
    define(['underscore', 'backbone', 'hammerjs'], function(_, Backbone) {
      factory(root, _, Backbone);
    });
  } else {
    // Browser globals
    factory(root, root._, root.Backbone);
  }
}(this, function(root, _, Backbone) {
  // reference to Backbone's jQuery handle
  var $ = Backbone.$;

  // check if jQuery Hammer is defined
  if( !$.fn.hammer ){
    throw new Error('Hammer jQuery plugin not loaded.');
  }

  // specify a regex to parse the hammerEvents hash
  var delegateEventSplitter = /^(\S+)\s*(.*)$/;

  // implement new view options
  var viewOptions = ['hammerEvents', 'hammerOptions'];

  // handles to Backbone.View, and the original delegateEvents / undelegateEvents methods
  var View = Backbone.View;
  var delegateEvents = View.prototype.delegateEvents;
  var undelegateEvents = View.prototype.undelegateEvents;

  // Extend Backbone.View
  // override its original definition with the extended version
  Backbone.View = View.extend({
    // specify a constructor to be invoked when initializing the view
    // see http://backbonejs.org/docs/backbone.html#section-209
    constructor: function(options){
      options = options || {};
      // extends the view with the hammerEvents / hammerOptions params (L25 of this annotated source)
      // uses underscore's pick to extract just those params
      // from the options that get passed into the constructor
      _.extend(this, _.pick(options, viewOptions));
      // invoke the original View constructor
      return View.apply(this, arguments);
    },

    // bool to keep track of whether the view has hammer events on it
    _hammered: false,

    // override the original undelegateEvents function
    // ensure that undelegateHammerEvents is called
    // in addition to the original undelegateEvents
    undelegateEvents: function(){
      this.undelegateHammerEvents();
      return undelegateEvents.apply(this, arguments);
    },

    // unbind all events prefixed with .hammerEvents + the unique id of the view
    undelegateHammerEvents: function(){
      if (this._hammered) {
        this.hammer().off('.hammerEvents' + this.cid);
      }
      return this;
    },

    // override original delegateEvents function
    // ensure delegateHammerEvents is called
    // in addition to the original delegateEvents
    delegateEvents: function(){
      delegateEvents.apply(this, arguments);
      this.delegateHammerEvents();
      return this;
    },

    delegateHammerEvents: function(events){
      // specifies options based on whether the param "hammerOptions" exists on the view
      // if it doesn't, use an empty object in addition to options specified in Backbone.hammerOptions
      var options = _.defaults(_.result(this, 'hammerOptions') || {}, Backbone.hammerOptions);

      // halt if no events were passed in, or if there are no hammerEvents specified
      if (!(events || (events = _.result(this, 'hammerEvents')))) return this;

      // begin by first undelegating any existing hammer events
      this.undelegateHammerEvents();

      // iterate over the hammerEvents hash --
      // just like events, it has a structure of {'event .selector': function(){}}
      for(var key in events) {
        // obtain the method associated with the key
        var method = events[key];
        // if the method is not actually a function,
        // check to see if it a reference to a function on the view
        if (!_.isFunction(method)) method = this[events[key]];

        // if there still is no method associated with this key,
        // stop current iteration and continue to next key
        if (!method) continue;

        // separate the event from the selector
        var match = key.match(delegateEventSplitter);
        var eventName = match[1], selector = match[2];
        eventName += '.hammerEvents' + this.cid;

        // modify the method associated with the key so that it is executed within
        // the context of the current view
        method = _.bind(method, this);

        if (selector === '') {
          // if there is no selector for the event, bind the hammer event
          // and its associated method directly onto the view
          this.hammer(options).on(eventName, method);
        } else {
          // otherwise, bind it onto the selector
          this.hammer(options).on(eventName, selector, method);
        }
      }
      return this;
    },

    // helper function which, in addition to invoking this.$el.hammer(),
    // additionally sets a flag to keep track of whether the view
    // has hammer events bound to it
    hammer: function(options){
      this._hammered = true;
      return this.$el.hammer(options);
    }
  });
}));

/**
 *  _____________________
 * |  _________________  |
 * | | jCalculator     | |
 * | |_________________| |
 * |  ___ ___ ___   ___  |
 * | | 7 | 8 | 9 | | + | |
 * | |___|___|___| |___| |
 * | | 4 | 5 | 6 | | - | |
 * | |___|___|___| |___| |
 * | | 1 | 2 | 3 | | x | |
 * | |___|___|___| |___| |
 * | | C | 0 | = | | / | |
 * | |___|___|___| |___| |
 * |_____________________|
 *
 * @author: Marius Balaj & Adrian Valentin Dan
 * @contact: balajmarius93@gmail.com
 */


var template =
    '<div class="jcalculator">' +
    '<span>7</span>' +
    '<span>8</span>' +
    '<span>9</span>' +
    '<span class="op">+</span>' +
    '<span>4</span>' +
    '<span>5</span>' +
    '<span>6</span>' +
    '<span class="op">-</span>' +
    '<span>1</span>' +
    '<span>2</span>' +
    '<span>3</span>' +
    '<span class="op">x</span>' +
    '<span>C</span>' +
    '<span>0</span>' +
    '<span class="eq">=</span>' +
    '<span class="op">&divide;</span>' +
    '</div>';


;
(function($) {

  $.fn.calculator = function(options) {

    function Controller(el) {
            var self = this;

            /**
             * Merge user options with defaults
             */

            this.options = $.extend({}, Controller.defaults, options);


            el.wrap('<div class="jcalculator_wrap"></div>');
            el.after(template);

            this.display = el;
            this.element = el.next();

            /**
             * Add theme
             */

            this.element.addClass(this.options.theme);


            this.value = this.load();

            this.stack = null;
            this.stackOp = null;
            this.clearStack = true;


            $('span', this.element).on('click', function() {

                var code = $(this).text().trim();

                if (isNaN(code)) {

                    if (code == 'C') {
                        self.digit;
                    } else if (code.charCodeAt(0) == 247) {
                        self.op = '/';
                    } else if (code.charCodeAt(0) == 61) {

                        self.op = code;

                        /**
                         * Results callback
                         */

                        self.options.onResult(self.value);

                    } else {
                        self.op = code;
                    }

                } else {

                    self.digit = code;
                }

				if (code== '=') {
					$(this).parent().find('.jcalculator').hide();
				}
                /**
                 * Material ripple effect
                 */

                var $ripple;

                if (self.options.theme == 'material') {

                    $ripple = $(this).find('.ripple');

                    if (!$ripple.length) {
                        $('<i class="ripple"></i>').appendTo($(this)).addClass('animate');
                    } else {
                        $ripple.removeClass('animate');
                        setTimeout(function() { $ripple.addClass('animate') }, 0);
                    }

                }

                /**
                 * onInput() callback
                 */

                self.options.onInput($(this), code);
            });
        }

    Controller.prototype = {

      load: function() {
        return this.display.val() || this.display.text();
      },

      save: function() {
        if (this.display.is('input')) this.display.val(this.value);
        else this.display.text(this.value);
      },

      /**
       * Get value
       */

      get v() {
        return this.value;
      },

      /**
       * Set value
       */

      set v(val) {
        this.clearStack = false;
        this.value = val;
        this.save();
      },

      /**
       * Get operation
       */

      get op() {
        return this.stackOp;
      },


      /**
       * Set operation
       */

      set op(value) {

        switch (this.stackOp) {
          case '+':
            this.v = this.stack + this.v;
            break;
          case '-':
            this.v = this.stack - this.v;
            break;
          case 'x':
            this.v = this.stack * this.v;
            break;
          case '/':
            this.v = this.stack / this.v;
            break;
        }

        this.stack = this.v;
        this.stackOp = value;
        this.clearStack = true;
      },

      /**
       * Set digit
       */

      set digit(d) {
        d = parseInt(d);
        if (this.clearStack) return this.v = d;
        return this.v = this.v * 10 + d;
      },

      /**
       * Get digit
       */

      get digit() {
        if (this.clearStack) return this.v = 0;
        return this.v = Math.floor(this.v / 10);
      }

    };

    /**
     * Controllers defaults
     */

    Controller.defaults = {
      theme: 'material',
      onInput: function() {},
      onResult: function() {}
    };

    /**
     * Init jCalculator
     */

    var controller;

    this.each(function() {

      controller = new Controller($(this));

      $(this).on('focus', function() {
        $(this).parent().find('.jcalculator').show();
      });
			/*
      $(this).on('blur', function() {
        $(this).parent().find('.jcalculator').hide();
      });
		  */
    });

    return controller;
  };

})(jQuery);

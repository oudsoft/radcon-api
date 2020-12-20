(function ( $ ) {

  $.fn.countdownclock = function( options ) {

    // This is the easiest way to have default options.
    var settings = $.extend({
      // These are the defaults.
      color: "#556b2f",
      backgroundColor: "white",
      countToHH: 0,
      countToMN: 10,
      blinkColor: 'white',
      dangerColor: 'red'

    }, options );

    var counter = null;
    var flasher = null;
    var isHide = false;
    var isDanger = false;
    var clockWrapper = $("<div id='ClockWrapper'></div>");
    var clockHHFrag = $("<span></span>");
    var clockCoFrag = $("<span> : </span>");
    var clockMNFrag = $("<span></span>");
    var $this = this;

    function numToDigit(num) {
      if (num < 10) {
        return '0' + num;
      } else {
        return num;
      }
    }

    function clockTriggerCount(){
      if (!isDanger) {
        counter = window.setTimeout(()=>{
          settings.countToMN = settings.countToMN - 1;
          if (settings.countToHH == 0) {
            if (settings.countToMN == 0) {
              //Trigger Alarm
              $(clockHHFrag).empty().append('00');
              $(clockMNFrag).empty().append(numToDigit(settings.countToMN));

              isDanger = true;
              window.clearTimeout(counter);
              //window.clearTimeout(flasher);
              $(clockWrapper).css('color', settings.dangerColor);
              eventData = {countToHH: settings.countToHH, countToMN: settings.countToMN};
              $this.trigger('countdowntrigger', [eventData]);
            } else {
              $(clockHHFrag).empty().append('00');
              $(clockMNFrag).empty().append(numToDigit(settings.countToMN));
              clockTriggerCount();
            }
          } else {
            if (settings.countToMN == 0) {
              settings.countToHH = settings.countToHH - 1;
              settings.countToMN = 59;
            }
            $(clockHHFrag).empty().append(numToDigit(settings.countToHH));
            $(clockMNFrag).empty().append(numToDigit(settings.countToMN));
            clockTriggerCount();
          }
        }, (60*1000));
      }
    }

    function clockTriggerFlash(){
      flasher = window.setTimeout(()=>{
        if (isHide) {
          isHide = false;
          if (isDanger) {
            $(clockHHFrag).css('color', '');
            $(clockMNFrag).css('color', '');
            $(clockCoFrag).css('color', '');
          } else {
            $(clockCoFrag).css('color', '');
          }
        } else {
          isHide = true;
          if (isDanger) {
            $(clockHHFrag).css('color', settings.blinkColor);
            $(clockMNFrag).css('color', settings.blinkColor);
            $(clockCoFrag).css('color', settings.blinkColor);
          } else {
            $(clockCoFrag).css('color', settings.blinkColor);
          }
        }
        clockTriggerFlash();
      }, 500)
    }

    function startClock(){
      clockTriggerFlash();
      clockTriggerCount();
    }

    // Greenify the collection based on the settings variable.
    $(clockHHFrag).empty().append(numToDigit(settings.countToHH));
    $(clockMNFrag).empty().append(numToDigit(settings.countToMN));
    $(clockWrapper).append($(clockHHFrag)).append($(clockCoFrag)).append($(clockMNFrag));
    startClock();
    return this.append($(clockWrapper));

  };

}( jQuery ));

/*jquery-custom-urgent-plugin.js */
(function ( $ ) {

  $.ajaxSetup({
    beforeSend: function(xhr) {
      xhr.setRequestHeader('Authorization', localStorage.getItem('token'));
    }
  });

  $.fn.customurgent = function( options ) {
    // switchToggle Clear/Load Json ให้ถูก
    // item common=R ให้ load to main when selectMainJson.length > 1 item

    const inputStyleClass = {"font-family": "THSarabunNew", "font-size": "24px"};
    const modalStyleClass = {"display": "none", "position": "fixed", "z-index": "1", "left": "0",	"top": "0",	"width": "100%", "min-height": "100%", "overflow": "auto",	"background-color": "rgb(0,0,0)",	"background-color": "rgba(0,0,0,0.4)" };
    const modalContentWrapperClass = {"width": "45%", "background-color": "white"};
    const modalHeaderClass = {"width": "100%", "height": "auto", "background-color": "blue", "color": "white", "padding": "4px", "text-align": "left"};
    const modalContentClass = {"width": "100%", "height": "auto", "background-color": "white", "padding": "4px", "text-align": "left"};
    const modalFooterClass = {"font-size": "30px", "width": "100%", "height": "auto", "background-color": "blue", "padding": "4px", "text-align": "center"};

    const dayOptions = [{id: 1, displayText: 'ภายในวันนี้'}, {id: 2, displayText: 'ภายในพรุ่งนี้'}, {id: 3, displayText: 'ภายใน 3 วัน'}, {id: 7, displayText: 'ภายใน 7 วัน'}];

    // This is the easiest way to have default options.
    var settings = $.extend({
      // These are the defaults.
      color: "",
      backgroundColor: "",
    }, options );

    var $this = this;
    var urgentFormHandle;


    const init = function() {
      $this.urgentFormHandle = undefined;
      doShowDialog();
      /*
      console.log($this.urgentFormHandle);
      console.log(settings);
      */
    }

    const setBoxToCenter = function(box) {
      $(box).css("position","absolute");
      $(box).css("top", "10px");
      //$(box).css("top", Math.max(0, (($(window).height() - $(this).outerHeight()) / 8)/* + $(window).scrollTop()*/) + "px");
      $(box).css("left", Math.max(0, (($(window).width() - $(box).outerWidth()) / 4) +  $(window).scrollLeft()) + "px");
    }

    const doFillSigleDigit = function(x) {
      if (Number(x) < 10) {
        return '0' + x;
      } else {
        return '' + x;
      }
    }

    const doCalNewTime = function(dd, hh, mn) {
      let totalShiftTime = (dd * 24 * 60 * 60 * 1000) + (hh * 60 * 60 * 1000) + (mn * 60 * 1000);
      let atDate = new Date();
      let atTime = atDate.getTime() + totalShiftTime;
      return (atDate.getTime() + totalShiftTime);
    }

    const doDisplayCustomUrgentResult = function(dd, hh, mn) {
      let totalShiftTime = (dd * 24 * 60 * 60 * 1000) + (hh * 60 * 60 * 1000) + (mn * 60 * 1000);
      let atDate = new Date();
      let atTime = atDate.getTime() + totalShiftTime;
      atTime = new Date(atTime);
      let YY = atTime.getFullYear();
      let MM = doFillSigleDigit(atTime.getMonth() + 1);
      let DD = doFillSigleDigit(atTime.getDate());
      let HH = doFillSigleDigit(atTime.getHours());
      let MN = doFillSigleDigit(atTime.getMinutes());
      let td = `${YY}-${MM}-${DD} : ${HH}.${MN}`;
      return td;
    }

    const doEditInputValue = function(ugData){
      if (ugData.Accept.dd) {
        $($this.urgentFormHandle).find('#AcceptStep').find('#DaySelector').val(ugData.Accept.dd);
      } else {
        $($this.urgentFormHandle).find('#AcceptStep').find('#DaySelector').val(0);
      }
      if (ugData.Accept.hh) {
        $($this.urgentFormHandle).find('#AcceptStep').find('#HourSelector').val(ugData.Accept.hh);
      } else {
        $($this.urgentFormHandle).find('#AcceptStep').find('#HourSelector').val(0);
      }
      if (ugData.Accept.mn) {
        $($this.urgentFormHandle).find('#AcceptStep').find('#MinuteSelector').val(ugData.Accept.mn);
      } else {
        $($this.urgentFormHandle).find('#AcceptStep').find('#MinuteSelector').val(0);
      }
      $($this.urgentFormHandle).find('#AcceptStep').find('#DaySelector').change();
      if (ugData.Working.dd) {
        $($this.urgentFormHandle).find('#WorkingStep').find('#DaySelector').val(ugData.Working.dd);
      } else {
        $($this.urgentFormHandle).find('#WorkingStep').find('#DaySelector').val(0);
      }
      if (ugData.Working.hh) {
        $($this.urgentFormHandle).find('#WorkingStep').find('#HourSelector').val(ugData.Working.hh);
      } else {
        $($this.urgentFormHandle).find('#WorkingStep').find('#HourSelector').val(0);
      }
      if (ugData.Working.mn){
        $($this.urgentFormHandle).find('#WorkingStep').find('#MinuteSelector').val(ugData.Working.mn);
      } else {
        $($this.urgentFormHandle).find('#WorkingStep').find('#MinuteSelector').val(0);
      }
      $($this.urgentFormHandle).find('#WorkingStep').find('#DaySelector').change();
    }

    const doCreateUrgentInputPanel = function(panelId){
      let inputPanel = $('<div style="display: table; width: 100%; border-collapse: collapse; padding: 5px;"></div>');
      $(inputPanel).prop('id', panelId);
      let headerRow = $('<div style="display: table-row; width: 100%;"></div>');
      $(headerRow).appendTo($(inputPanel));
      let headerCell = $('<div style="display: table-cell; vertical-align: middle; padding: 4px;">วัน</div>');
      $(headerCell).appendTo($(headerRow));
      headerCell = $('<div style="display: table-cell; vertical-align: middle; padding: 4px;">ชั่วโมง</div>');
      $(headerCell).appendTo($(headerRow));
      headerCell = $('<div style="display: table-cell; vertical-align: middle; padding: 4px;">นาที</div>');
      $(headerCell).appendTo($(headerRow));
      headerCell = $('<div style="display: table-cell; vertical-align: middle; padding: 4px;"></div>');
      $(headerCell).appendTo($(headerRow));

      let inputRow = $('<div style="display: table-row; width: 100%;"></div>');
      $(inputRow).appendTo($(inputPanel));
      let inputCell = $('<div style="display: table-cell; vertical-align: middle; padding: 4px;"></div>');
      $(inputCell).appendTo($(inputRow));
      let daySelector = $('<select id="DaySelector"></select>');
      for (let i=0; i < 8; i++) {
        $(daySelector).append($('<option value="' + i + '">' + i + '</div>'));
      }
      $(daySelector).appendTo($(inputCell));

      inputCell = $('<div style="display: table-cell; vertical-align: middle; padding: 4px;"></div>');
      $(inputCell).appendTo($(inputRow));
      let hourSelector = $('<select id="HourSelector"></select>');
      for (let i=0; i < 24; i++) {
        $(hourSelector).append($('<option value="' + i + '">' + i + '</div>'));
      }
      $(hourSelector).appendTo($(inputCell));

      inputCell = $('<div style="display: table-cell; vertical-align: middle; padding: 4px;"></div>');
      $(inputCell).appendTo($(inputRow));
      let minuteSelector = $('<select id="MinuteSelector"></select>');
      for (let i=0; i < 60; i++) {
        $(minuteSelector).append($('<option value="' + i + '">' + i + '</div>'));
      }
      $(minuteSelector).appendTo($(inputCell));

      inputCell = $('<div style="display: table-cell; vertical-align: middle; padding: 4px;"></div>');
      $(inputCell).appendTo($(inputRow));
      let resultDisplay = $('<div id="ResultDisplay" style="padding:4px; border: 1px solid black; background-color: #ccc; color: black; text-align: center; min-width: 110px; min-height: 38px; margin-top: 10px;"></div>');
      $(resultDisplay).appendTo($(inputCell));
      return $(inputPanel);
    }

    const doCreateUrgentForm = function(){
      let urgentFormBox = $('<div></div>');
      let acceptStepBox = $('<div style="border: 2px solid blue; padding: 5px;"></div>');
      $(acceptStepBox).appendTo($(urgentFormBox));
      let acceptStepLabel = $('<div><b>ระยะเวลาตอบรับเคส</b></div>');
      $(acceptStepLabel).appendTo($(acceptStepBox));
      let acceptStepInput = doCreateUrgentInputPanel('AcceptStep');
      $(acceptStepInput).appendTo($(acceptStepBox));

      let workingStepBox = $('<div style="border: 2px solid #EEDD0D; padding: 5px;"></div>');
      $(workingStepBox).css('margin-top', '10px');
      $(workingStepBox).appendTo($(urgentFormBox));
      let workingStepLabel = $('<div style="display: in-line;"><b>ระยะเวลาส่งผลอ่าน</b></div>');
      $(workingStepLabel).appendTo($(workingStepBox));
      $('<span>   </span>').appendTo($(workingStepLabel));
      let workingStepOption = $('<input type="checkbox" id="WorkingStepOption" value="0"><label for="WorkingStepOption"> ใช้ค่าเดียวกับระยะเวลาตอบรับเคส</label>');
      $(workingStepOption).appendTo($(workingStepLabel));
      let workingStepInput = doCreateUrgentInputPanel('WorkingStep');
      $(workingStepInput).appendTo($(workingStepBox));

      $(workingStepOption).on('click', (evt)=>{
  			let option = $(workingStepOption).prop('checked');
  			if (option) {
  				let dd = $(urgentFormBox).find('#AcceptStep').find('#DaySelector').val();
          let hh = $(urgentFormBox).find('#AcceptStep').find('#HourSelector').val();
          let mn = $(urgentFormBox).find('#AcceptStep').find('#MinuteSelector').val();

          $(urgentFormBox).find('#WorkingStep').find('#DaySelector').val(dd);
          $(urgentFormBox).find('#WorkingStep').find('#HourSelector').val(hh);
          $(urgentFormBox).find('#WorkingStep').find('#MinuteSelector').val(mn);
          $(urgentFormBox).find('#WorkingStep').find('#DaySelector').change();
  			} else {
          $(urgentFormBox).find('#WorkingStep').find('#DaySelector').val(1);
          $(urgentFormBox).find('#WorkingStep').find('#HourSelector').val(0);
          $(urgentFormBox).find('#WorkingStep').find('#MinuteSelector').val(0);
          $(urgentFormBox).find('#WorkingStep').find('#DaySelector').change();
  			}
  		});
      $(acceptStepInput).find('#DaySelector').on('change', (evt)=>{
        let dd = $(urgentFormBox).find('#AcceptStep').find('#DaySelector').val();
        let hh = $(urgentFormBox).find('#AcceptStep').find('#HourSelector').val();
        let mn = $(urgentFormBox).find('#AcceptStep').find('#MinuteSelector').val();
        let result = doDisplayCustomUrgentResult(dd, hh, mn);
        $(urgentFormBox).find('#AcceptStep').find('#ResultDisplay').text(result);
      });
      $(acceptStepInput).find('#HourSelector').on('change', (evt)=>{
        let dd = $(urgentFormBox).find('#AcceptStep').find('#DaySelector').val();
        let hh = $(urgentFormBox).find('#AcceptStep').find('#HourSelector').val();
        let mn = $(urgentFormBox).find('#AcceptStep').find('#MinuteSelector').val();
        let result = doDisplayCustomUrgentResult(dd, hh, mn);
        $(urgentFormBox).find('#AcceptStep').find('#ResultDisplay').text(result);
      });
      $(acceptStepInput).find('#MinuteSelector').on('change', (evt)=>{
        let dd = $(urgentFormBox).find('#AcceptStep').find('#DaySelector').val();
        let hh = $(urgentFormBox).find('#AcceptStep').find('#HourSelector').val();
        let mn = $(urgentFormBox).find('#AcceptStep').find('#MinuteSelector').val();
        let result = doDisplayCustomUrgentResult(dd, hh, mn);
        $(urgentFormBox).find('#AcceptStep').find('#ResultDisplay').text(result);
      });


      $(workingStepInput).find('#DaySelector').on('change', (evt)=>{
        let dd = $(urgentFormBox).find('#WorkingStep').find('#DaySelector').val();
        let hh = $(urgentFormBox).find('#WorkingStep').find('#HourSelector').val();
        let mn = $(urgentFormBox).find('#WorkingStep').find('#MinuteSelector').val();
        let result = doDisplayCustomUrgentResult(dd, hh, mn);
        $(urgentFormBox).find('#WorkingStep').find('#ResultDisplay').text(result);
      });
      $(workingStepInput).find('#HourSelector').on('change', (evt)=>{
        let dd = $(urgentFormBox).find('#WorkingStep').find('#DaySelector').val();
        let hh = $(urgentFormBox).find('#WorkingStep').find('#HourSelector').val();
        let mn = $(urgentFormBox).find('#WorkingStep').find('#MinuteSelector').val();
        let result = doDisplayCustomUrgentResult(dd, hh, mn);
        $(urgentFormBox).find('#WorkingStep').find('#ResultDisplay').text(result);
      });
      $(workingStepInput).find('#MinuteSelector').on('change', (evt)=>{
        let dd = $(urgentFormBox).find('#WorkingStep').find('#DaySelector').val();
        let hh = $(urgentFormBox).find('#WorkingStep').find('#HourSelector').val();
        let mn = $(urgentFormBox).find('#WorkingStep').find('#MinuteSelector').val();
        let result = doDisplayCustomUrgentResult(dd, hh, mn);
        $(urgentFormBox).find('#WorkingStep').find('#ResultDisplay').text(result);
      });

      return $(urgentFormBox);
    }

    const doCreateModalDialog = function(){
      let mainModal = $('<div id="Custom-Urgent-Dialog"></div>');
      $(mainModal).css(modalStyleClass);
      return $(mainModal);
    }

    const doCreateModalContent = function(){
      let modalWrapper = $('<div></div>');
      $(modalWrapper).css(modalContentWrapperClass);
      $(modalWrapper).css(settings.externalStyle);
      let modalHeader = $('<div><h3>กำหนดเวลารับผลอ่าน</h3></div>');
      $(modalHeader).css(modalHeaderClass);
      $(modalWrapper).append($(modalHeader));

      let modalContent = $('<div id="ModalContent"></div>');
      let guideBox = $('<divstyle="width: 100%; padding: 10px; margin-top: 10px; background: #ddd;>โปรดระบุวัน-เวลาที่จะใช้กำหนดเวลารับผลอ่านจากรังสีแพทย์</div>');
      $(guideBox).appendTo($(modalContent));
      let urgentForm = doCreateUrgentForm();

      $this.urgentFormHandle = urgentForm

      $(modalContent).append($(urgentForm));
      $(modalContent).css(modalContentClass);
      $(modalWrapper).append($(modalContent));

      let modalFooter = $('<div></div>');
      $(modalFooter).css(modalFooterClass);
      $(modalWrapper).append($(modalFooter));

      let okCmd = $('<input type="button" value=" OK "/>');
      $(okCmd).appendTo($(modalFooter));
      $(modalFooter).append('<span>  </span>');
      let cancelCmd = $('<input type="button" value=" Cancel "/>');
      $(cancelCmd).appendTo($(modalFooter));

      $(cancelCmd).on('click', (evt)=>{
        eventData = {};
        $(modalWrapper).trigger('closedialog', [eventData]);
      });

      $(okCmd).on('click', async (evt)=>{
        let ddA = $(urgentForm).find('#AcceptStep').find('#DaySelector').val();
        let hhA = $(urgentForm).find('#AcceptStep').find('#HourSelector').val();
        let mnA = $(urgentForm).find('#AcceptStep').find('#MinuteSelector').val();
        let resultA = doDisplayCustomUrgentResult(ddA, hhA, mnA);
        $(urgentForm).find('#AcceptStepResultDisplay').text(resultA);
        let newTimeA = doCalNewTime(ddA, hhA, mnA);

        let ddW = $(urgentForm).find('#WorkingStep').find('#DaySelector').val();
        let hhW = $(urgentForm).find('#WorkingStep').find('#HourSelector').val();
        let mnW = $(urgentForm).find('#WorkingStep').find('#MinuteSelector').val();
        let resultW = doDisplayCustomUrgentResult(ddW, hhW, mnW);
        $(urgentForm).find('#WorkingStepResultDisplay').text(resultW);
        let newTimeW = doCalNewTime(ddW, hhW, mnW);
        let critiriaMinute = (newTimeW - newTimeA)/(60 * 1000);
        if (critiriaMinute >= 15) {
          eventData = {Accept: {dd: (ddA-1), hh: hhA, mn: mnA, text: resultA}, Working: {dd: (ddW-1), hh: hhW, mn: mnW, text: resultW}};
          settings.successCallback(eventData);
          $(modalWrapper).trigger('closedialog', [eventData]);
        } else {
          alert('ระบะเวลาส่งผลอ่านต้องมากกว่าระยะเวลาตอบรับเคสอย่างน้อย 15 นาที');
        }
      });
      return $(modalWrapper);
    }

    const doShowDialog = function(){
      let mainModal = doCreateModalDialog();
      let content = doCreateModalContent();
      $(mainModal).append($(content));
      $('body').append($(mainModal));
      setBoxToCenter(content);
      $(mainModal).show();
      $(mainModal).find('#SearchScanPart').focus();
      $(mainModal).on('closedialog', (evt, data)=>{
        $(mainModal).remove();
      });
    }

    init();

    /* public method of plugin */
    let output = {
      displayCustomUrgentResult: function(dd, hh, mn) {
        doDisplayCustomUrgentResult(dd, hh, mn);
      },
      editInputValue: function(ugData) {
        doEditInputValue(ugData);
      }
    }

    return output;
  };

}( jQuery ));

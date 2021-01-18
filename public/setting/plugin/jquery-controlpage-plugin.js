/*jquery-controlpage-plugin.js */
(function ( $ ) {
  $.fn.controlpage = function( options ) {
    const optionValues = [1, 2, 3, 10, 20, 30, 50, 100];

    var settings = $.extend({
      // These are the defaults.
      color: "",
      backgroundColor: "",
      currentPage: 0,
      itemperPage: 0,
      totalItem: 0,
      totalPage: 0,
      firstCmdLabel: 'First',
      previousCmdLabel: 'Previous',
      nextCmdLabel: 'Next',
      lastCmdLabel: 'Last',
      /*onChangePage: function(value){settings.currentPage = value} */
    }, options );

    var $this = this;

    const changeToPage = function(page) {
      if ((page <= settings.totalPage) && (page >= 1)) {
        settings.currentPage = page;
      } else {
        settings.currentPage = 1;
      }
    }

    const doResetButtonCmd = function(wrapper){
      if (settings.itemperPage > 0) {
        if (settings.totalPage > 1) {
          if (settings.currentPage == 1) {
            $(wrapper).find('#FirstButtonCmd').hide();
            $(wrapper).find('#PreviousButtonCmd').hide();
            $(wrapper).find('#NextButtonCmd').show();
            $(wrapper).find('#LastButtonCmd').show();
          } else if (settings.currentPage == settings.totalPage) {
            $(wrapper).find('#FirstButtonCmd').show();
            $(wrapper).find('#PreviousButtonCmd').show();
            $(wrapper).find('#NextButtonCmd').hide();
            $(wrapper).find('#LastButtonCmd').hide();
          } else {
            $(wrapper).find('#FirstButtonCmd').show();
            $(wrapper).find('#PreviousButtonCmd').show();
            $(wrapper).find('#NextButtonCmd').show();
            $(wrapper).find('#LastButtonCmd').show();
          }
        } else { //settings.totalPage == 1/0
          $(wrapper).find('#FirstButtonCmd').hide();
          $(wrapper).find('#PreviousButtonCmd').hide();
          $(wrapper).find('#NextButtonCmd').hide();
          $(wrapper).find('#LastButtonCmd').hide();
        }
      } else {
        $(wrapper).find('#FirstButtonCmd').hide();
        $(wrapper).find('#PreviousButtonCmd').hide();
        $(wrapper).find('#NextButtonCmd').hide();
        $(wrapper).find('#LastButtonCmd').hide();
      }
      $(wrapper).find('#CurrentPageInput').val(settings.currentPage);
      $(wrapper).find('#TotalPageText').text(' / ' + settings.totalPage).css({'font-size': '24px'});
    }

    const calTotalPage = function(){
      let totalPage = (settings.totalItem / settings.itemperPage);
      totalPage = parseInt(totalPage);
      let modPage = (settings.totalItem % settings.itemperPage);
      if (modPage > 0) {
        totalPage += 1;
      }
      settings.totalPage = totalPage;
    }

    const setupItemperPage = function(value) {
      if (value == 0) {
        settings.itemperPage = settings.totalItem;
      } else {
        settings.itemperPage = value;
      }
      calTotalPage();
    }

    const setupTotalItem = function(value) {
      settings.totalItem = value;
      calTotalPage();
    }

    const doCreateFirstCmd = function(clickEvt){
      let firstCmdButton = $('<input type="button" id="FirstButtonCmd"/>');
      $(firstCmdButton).val(settings.firstCmdLabel);
      $(firstCmdButton).on('click', (evt)=>{
        changeToPage(1);
        clickEvt(settings.currentPage);
      });
      return $(firstCmdButton);
    }

    const doCreatePreviousCmd = function(clickEvt){
      let previousCmdButton = $('<input type="button" id="PreviousButtonCmd"/>');
      $(previousCmdButton).val(settings.previousCmdLabel);
      $(previousCmdButton).on('click', (evt)=>{
        changeToPage((settings.currentPage - 1));
        clickEvt(settings.currentPage);
      });
      return $(previousCmdButton);
    }

    const doCreateNextCmd = function(clickEvt){
      let nextCmdButton = $('<input type="button" id="NextButtonCmd"/>');
      $(nextCmdButton).val(settings.nextCmdLabel);
      $(nextCmdButton).on('click', (evt)=>{
        changeToPage((settings.currentPage + 1));
        clickEvt(settings.currentPage);
      });
      return $(nextCmdButton);
    }

    const doCreateLastCmd = function(clickEvt){
      let lastCmdButton = $('<input type="button" id="LastButtonCmd"/>');
      $(lastCmdButton).val(settings.lastCmdLabel);
      $(lastCmdButton).on('click', (evt)=>{
        changeToPage((settings.totalPage));
        clickEvt(settings.currentPage);
      });
      return $(lastCmdButton);
    }

    const doCreateTotalPage = function(){
      let totalPageFrage = $('<span id="TotalPageText">' + ' / ' + settings.totalPage + '</span>');
      return $(totalPageFrage);
    }

    const doCreateCurrentPage = function(gotoEvt){
      let currentPageInput = $('<input type="number" id="CurrentPageInput"/>');
      $(currentPageInput).css({'width': '40px'});
      $(currentPageInput).val(settings.currentPage);
      $(currentPageInput).on('keyup', (event)=>{
        if (event.keyCode === 13) {
          event.preventDefault();
          let userNumberPage = $(currentPageInput).val();
          let page = Number(userNumberPage);
          if (page > 0) {
            changeToPage((page));
            gotoEvt(page);
          }
        }
      });
      return $(currentPageInput);
    }

    const doCreateItemperPageOption = function( changeEvt){
      let itemperPageSelector = $('<select></select>');
      $(itemperPageSelector).append($('<option value="0">All</option>'));
      optionValues.forEach((item, i) => {
        $(itemperPageSelector).append($('<option value="' + item + '">' + item + '</option>'));
      });
      $(itemperPageSelector).val(settings.itemperPage);
      $(itemperPageSelector).on('change', (evt)=>{
        let newValue = $(itemperPageSelector).val();
        settings.itemperPage = newValue;
        settings.currentPage = 1;

        calTotalPage();

        let myWrapper = $(itemperPageSelector).parent();
        doResetButtonCmd(myWrapper);
        setupItemperPage(newValue);
        changeEvt(newValue);
      })
      return $(itemperPageSelector);
    }

    const doCreateNavigBar = function(changeToPage, itemperPageChange) {
      let navigBar = $('<div></div>');
      $(navigBar).css(settings.styleClass);

      let firstCmd = doCreateFirstCmd((currentPage)=>{
        changeToPage(currentPage);
        doResetButtonCmd(navigBar);
      });
      $(firstCmd).appendTo($(navigBar));

      let previousCmd = doCreatePreviousCmd((currentPage)=>{
        changeToPage(currentPage);
        doResetButtonCmd(navigBar);
      });
      $(previousCmd).appendTo($(navigBar));

      let currentPageInput = doCreateCurrentPage((page)=>{
        changeToPage(page);
        doResetButtonCmd(navigBar);
      });
      $(currentPageInput).appendTo($(navigBar));

      let totalPageText = doCreateTotalPage();
      $(totalPageText).appendTo($(navigBar));

      let itemperPageOption = doCreateItemperPageOption((newItemperPage)=>{
        itemperPageChange(newItemperPage);
        doResetButtonCmd(navigBar);
      });
      $(itemperPageOption).appendTo($(navigBar));

      let nextCmd = doCreateNextCmd((currentPage)=>{
        changeToPage(currentPage);
        doResetButtonCmd(navigBar);
      });
      $(nextCmd).appendTo($(navigBar));

      let lastCmd = doCreateLastCmd((currentPage)=>{
        changeToPage(currentPage);
        doResetButtonCmd(navigBar);
      });
      $(lastCmd).appendTo($(navigBar));

      return $(navigBar);
    }

    const init = function() {
      const itemperPageChange = function(newValue) {
        goToPage(settings.currentPage);
        let eventData = {key: 'itemperpage', value: newValue};
        $($this).trigger('defualsettingschange', [eventData]);
        console.log('==== ok =========');
      }
      const goToPage = function(page) {
        let itemPerPage = Number(settings.itemperPage);
        let fromItem = (Number(page-1) * itemPerPage) + 1;
        let toItem = (fromItem + itemPerPage) -1;
        let showItem = {fromItem, toItem};
        $this.settings.changeToPageCallback(showItem);
      }

      $this.settings = settings;

      calTotalPage();

      let navigBar = doCreateNavigBar(goToPage, itemperPageChange);

      goToPage(settings.currentPage);

      return $(navigBar);
    }

    /*
    pluginOption {
      currentPage: 1,
      itemperPage: 20,
      totalItem: 0,
      styleClass
      changeToPageCallback
    }

    */

    const navigButtonBar = init();
    this.append($(navigButtonBar));

    /* public method of plugin */
    var output = {
      settings: $this.settings,
      navigHandle: navigButtonBar,
      toPage: function(pageNo) {
        changeToPage(pageNo);
        doResetButtonCmd(navigButtonBar);
      }
    }

    return output;

  };
}( jQuery ));

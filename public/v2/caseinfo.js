$.fn.center = function () {
  this.css("position","absolute");
  this.css("top", Math.max(0, (($(window).height() - $(this).outerHeight()) / 2) + $(window).scrollTop()) + "px");
  this.css("left", Math.max(0, (($(window).width() - $(this).outerWidth()) / 2) +  $(window).scrollLeft()) + "px");
  return this;
}

const cookieName = "readconnext";
const apiHostURL = 'https://radconnext.com/radconnext/api/';
const zoomProxyReqURL = 'https://radconnext.info';
const inputStyleClass = {"font-family": "THSarabunNew", "font-size": "24px"};

const doCallApi = function (apiurl, params) {
  //return new Promise(function(resolve, reject) {
   var dfd = $.Deferred();
    $.post(apiurl, params, function(data){
      dfd.resolve(data);
    }).fail(function(error) {
      dfd.reject(error);
    });
    return dfd.promise();
  //});
}

const doCallApiByProxy = function (apiname, params) {
  //return new Promise(function(resolve, reject) {
    var dfd = $.Deferred();
    let proxyUrl = '/api/external/callapi';
    $.post(proxyUrl, params, function(data){
      dfd.resolve(data);
    }).fail(function(error) {
      dfd.reject(error);
    });
    return dfd.promise();
  //});
}

const doCallZoomApiByProxy = function (params) {
  //return new Promise(function(resolve, reject) {
    var dfd = $.Deferred();
    let proxyUrl = '/api/external/callzoomapi';
    $.post(proxyUrl, params, function(data){
      dfd.resolve(data);
    }).fail(function(error) {
      dfd.reject(error);
    });
    return dfd.promise();
  //});
}

const urlQueryToObject = function(url) {
  let result = url.split(/[?&]/).slice(1).map(function(paramPair) {
        return paramPair.split(/=(.+)?/).slice(0, 2);
    }).reduce(function (obj, pairArray) {
        obj[pairArray[0]] = pairArray[1];
        return obj;
    }, {});
  return result;
}

const doGetOrthancPort = function() {
  //return new Promise(function(resolve, reject) {
    var dfd = $.Deferred();
    /*
    let orthancProxyEndPoint = '/webapp/orthancproxy/orthancexternalport';
    let params = {};
    $.get(orthancProxyEndPoint, params, function(data){
      dfd.resolve(data);
    });
    */
    let hospitalId = cookie.org[0].id;
    if (hospitalId == 13) {
      dfd.resolve({port: 9043});
    } else if (hospitalId == 5) {
      dfd.resolve({port: 9042});
    } else if (hospitalId == 14) {
      dfd.resolve({port: 9044});
    } else {
      dfd.resolve({port: 8042});
    }
    return dfd.promise();
  //});
}

const formatStudyDate = function(studydateStr){
	if (studydateStr.length >= 8) {
		var yy = studydateStr.substr(0, 4);
		var mo = studydateStr.substr(4, 2);
		var dd = studydateStr.substr(6, 2);
		var stddf = yy + '-' + mo + '-' + dd;
		var stdDate = new Date(stddf);
		var month = stdDate.toLocaleString(/*'default', { month: 'short' }*/);
		return Number(dd) + ' ' + month + ' ' + yy;
	} else {
		return studydateStr;
	}
}

const doDownloadResult = function(pageUrl, patient, casedate, caseId){
  //return new Promise(function(resolve, reject) {
    var dfd = $.Deferred();
    let convertorEndPoint = '/api/v2/convertpdffile';
    let params = {url: pageUrl, name: patient, date: casedate, caseId: caseId};
    $.post(convertorEndPoint, params, function(data){
      dfd.resolve(data);
    }).fail(function(error) {
      dfd.reject(error);
    });
    return dfd.promise();
  //});
}

const formatStartTimeStr = function(){
  let d = new Date().getTime() + (5*60*1000);
  d = new Date(d);
  var yy, mm, dd, hh, mn, ss;
  yy = d.getFullYear();
  if (d.getMonth() + 1 < 10) {
    mm = '0' + (d.getMonth() + 1);
  } else {
    mm = '' + (d.getMonth() + 1);
  }
  if (d.getDate() < 10) {
    dd = '0' + d.getDate();
  } else {
    dd = '' + d.getDate();
  }
  if (d.getHours() < 10) {
    hh = '0' + d.getHours();
  } else {
     hh = '' + d.getHours();
  }
  if (d.getMinutes() < 10){
     mn = '0' + d.getMinutes();
  } else {
    mn = '' + d.getMinutes();
  }
  if (d.getSeconds() < 10) {
     ss = '0' + d.getSeconds();
  } else {
    ss = '' + d.getSeconds();
  }
  //var td = `${yy}-${mm}-${dd}T${hh}:${mn}:${ss}`;
  var td = yy + '-' + mm + '-' + dd + 'T' + hh + ':' + mn + ':' + ss;
  return td;
}

var cookie;

$( document ).ready(function() {
	console.log('page on ready ...');
	const initPage = function() {
		var cookieValue = $.cookie(cookieName);
		if (cookieValue) {
			cookie = JSON.parse(cookieValue);
			if (cookie) {
				if ((cookie.id) && (cookie.username)) {
					doLoadMainPage();
          console.log(cookie);
				} else {
					doLoadLogin()
				}
			} else {
				doLoadLogin()
			}
		} else {
			doLoadLogin()
		}
	};

	initPage();

});

function doLoadLogin() {
	$('#app').load('../form/login.html', function(){
		$(".container").css({"min-height": "100%"});
		$(".main").center();
		$("#login-cmd").click(function(){
			doLogin();
		});
    $("#password").on('keypress',function(e) {
      if(e.which == 13) {
        doLogin();
      };
    });
	});
}

function doLogin(){
	var username = $("#username").val();
	var password = $("#password").val();
	// Checking for blank fields.
	if( username == '' || password == ''){
		$('input[type="text"],input[type="password"]').css("border","2px solid red");
		$('input[type="text"],input[type="password"]').css("box-shadow","0 0 3px red");
		$('#login-msg').html('<p>Please fill all fields...!!!!!!</p>');
		$('#login-msg').show();
	} else {
		let user = {username: username, password: password};
		console.log(user);
		doCallLoginApi(user).then(function (response) {
			var resBody = JSON.parse(response.res.body);
			//var resBody = JSON.parse(response); <= ใช้ในกรณีเรียก API แบบ Direct

			console.log(resBody);
			if (resBody.success == false) {
				$('input[type="text"]').css({"border":"2px solid red","box-shadow":"0 0 3px red"});
				$('input[type="password"]').css({"border":"2px solid #00F5FF","box-shadow":"0 0 5px #00F5FF"});
				$('#login-msg').html('<p>Username or Password incorrect. Please try with other username and password again.</p>');
				$('#login-msg').show();
			} else {
				$.cookie(cookieName, JSON.stringify(resBody), { expires : 1 });
				doLoadMainPage();
			}
		});
	}
}

function doCallLoginApi(user) {
	//return new Promise(function(resolve, reject) {
    var dfd = $.Deferred();
		const loginApiName = 'chk_login'
		const body = { username: user.username, password: user.password };
		var realUrl = apiHostURL + loginApiName + '.php';
		var params = {method: 'post', body: body, url: realUrl, apiname: loginApiName};
		$.when(doCallApiByProxy(loginApiName, params)).done(function (response) {
			//console.log('response', response);
			dfd.resolve(response);
		});
    return dfd.promise();
	//});
}

function doUserLogout() {
	const logoutApiName = 'logout'
	const body = {username: cookie.username};
	var realUrl = apiHostURL + logoutApiName + '.php';
	var params = {method: 'post', body: body, url: realUrl, apiname: logoutApiName};
	$.when(doCallApiByProxy(logoutApiName, params)).done(function(response) {
    console.log(response);
		if (response.status.code == 200) {
			$.removeCookie(cookieName);
			doLoadLogin();
		}
	});
}

function doLoadMainPage(){
	let paths = window.location.pathname.split('/');
	let rootname = paths[1];
  let jqueryLoadingUrl = '../lib/jquery.loading.min.js';
  $('head').append('<script src="' + jqueryLoadingUrl + '"></script>');
  $('body').append($('<div id="overlay"><div class="loader"></div></div>'));
  $('body').loading({overlay: $("#overlay"), stoppable: true});
  $('body').loading('stop');
  $('#app').load('../form/v2/main.html', function(){
		var cookieValue = $.cookie(cookieName);
		cookie = JSON.parse(cookieValue);
    $('.header').append('<h2>' + cookie.org[0].name + '</h2>');
    $('#Case-Cmd').hide();
    $('#Doctor-Cmd').hide();
    $('#Hotpital-Cmd').hide();
    $('#Setting-Cmd').hide();
		$("#User-Identify").text(cookie.name);
		$("#User-Identify").click(function(){
			doShowUserProfile();
		});
    $("#Logout-Cmd").click(function(){
			doUserLogout();
		});

    $('.row').hide();
    $('.mainfull').show();

    doShowCaseInfo();
  });
}

function doShowUserProfile() {
	$("#dialog").load('../form/v2/dialog.html', function() {
		$("#UserStaus").text(cookie.curr_status);
		$("#OrgName").text(cookie.org[0].name);
		$("#PositionName").val(cookie.org[0].position);
		$("#Username").text(cookie.username);
		$("#Password").hide();
		$("#Name").val(cookie.name);
		$("#Telno").val(cookie.tel);
		$("#Email").val(cookie.email);
		$("#LineId").val(cookie.LineId);
		$("#Comment").val(cookie.comment);
		$(".modal-footer").css('text-align', 'center');
    $("#SaveUserProfile-Cmd").hide();
	});
}

function doShowCaseInfo(){
  let queryObj = urlQueryToObject(window.location.href);
  if (queryObj.caseId) {
    $('body').loading('start');
    const apiName = 'get_case_info';
		const body = { username: cookie.username, id: queryObj.caseId };
		var realUrl = apiHostURL + apiName + '.php';
		var params = {method: 'post', body: body, url: realUrl, apiname: apiName};
    doCallApiByProxy(apiName, params).then(function(apiRes) {
      let caseRes = JSON.parse(apiRes.res.body);
      console.log(caseRes);
      if (caseRes.success) {
        doCreateCaseBox(caseRes.inc_data).then(function(caseBox){
          doCreateDicomBox(caseRes.inc_data).then(function(dicomBox){
            doCreatePatientBox(caseRes.inc_data).then(function(patientBox){

              $('.mainfull').append($('<div class="accorhead"><b>ข้อมูลเคส</b></div>'));
              let casecontBox = $('<div class="accorcont"></div>');
              $(casecontBox).append($(caseBox));
              $('.mainfull').append($(casecontBox));

              $('.mainfull').append($('<div class="accorhead"><b>ข้อมูล Dicom</b></div>'));
              let dicomcontBox = $('<div class="accorcont"></div>');
              $(dicomcontBox).append($(dicomBox));
              $('.mainfull').append($(dicomcontBox));

              $('.mainfull').append($('<div class="accorhead"><b>ข้อมูลผู้ป่วย</b></div>'));
              let patientcontBox = $('<div class="accorcont"></div>');
              $(patientcontBox).append($(patientBox));
              $('.mainfull').append($(patientcontBox));

              if ((caseRes.inc_data.result_data) && (caseRes.inc_data.result_data.length > 0)) {
                doCreateResultBox(caseRes.inc_data).then(function(caseResultBox){
                  let caseResultHeadBox = $('<div id="CaseResultHeadBox" class="accorhead"><b>ผลอ่าน</b></div>');
                  $('.mainfull').append($(caseResultHeadBox));
                  let caseResultcontBox = $('<div class="accorcont"></div>');
                  $(caseResultcontBox).append($(caseResultBox));
                  $('.mainfull').append($(caseResultcontBox));

                  let toolsSectionDiv = $('<div id="ToolsDiv" class="casetools"></div>');
                  $('.mainfull').append($(toolsSectionDiv));

                  let zoomCallerCmd = doCreateZoomCaller(caseRes.inc_data);
                  $(zoomCallerCmd).css({"margin-left": "10px", "margin-top": "3px"});
                  $(toolsSectionDiv).append($(zoomCallerCmd));

                  let messageSenderCmd = doCreateMessageSender(caseRes.inc_data);
                  $(messageSenderCmd).css({"margin-left": "10px", "margin-top": "3px"});
                  $(toolsSectionDiv).append($(messageSenderCmd));

                  let messageInputDiv = doCreateMessageInput(caseRes.inc_data);
                  $(messageInputDiv).css({"margin-left": "10px", "margin-top": "3px"});
                  $('.mainfull').append($(messageInputDiv));

                  $('.mainfull').css({'padding': '5px'});
                  $('body').loading('stop');
                });
              } else {
                $('body').loading('stop');
              }

              $('.accorhead').click(function (e){
                if($(this).next('.accorcont').css('display') != 'block'){
                  $('.active').slideUp('fast').removeClass('accoractive');
                  $(this).next('.accorcont').addClass('accoractive').slideDown('slow');
                } else {
                  $(this).next('.accorcont').slideUp('fast').removeClass('accoractive');
                }
              });

              $('.mainfull').find('#CaseResultHeadBox').click();


            });
          });
        });
      } else {
        let caseIdError = $('<div id="CaseIdError"><h3 class="blink">รหัสเคสไม่ถูกต้อง</h3></div>');
        $(caseIdError).center();
        $(caseIdError).css({'background-color': 'red', 'color': 'white', 'padding': '10px'});
        $('.mainfull').append($(caseIdError));
        $('body').loading('stop');
      }
    });
  } else {
    let caseIdError = $('<div id="CaseIdError"><h3 class="blink">รหัสเคสไม่ถูกต้อง</h3></div>');
    $(caseIdError).center();
    $(caseIdError).css({'background-color': 'red', 'color': 'white', 'padding': '10px'});
    $('.mainfull').append($(caseIdError));
  }
  $('.mainfull').css(inputStyleClass);
}

function doCreateCaseBox(caseBody) {
  //return new Promise(function(resolve, reject) {
    var dfd = $.Deferred();

    let caseBox = $('<div id="CaseBox" style="display: table; padding: 4px;"></div>');

    let tableRow = $('<div style="display: table-row;"></div>');
		let rowDetail = $('<div style="display: table-cell; width: 250px;"><b>รหัสเคส</b></div><div style="display: table-cell"><b>' + caseBody.id  + '</b></div>');
		$(tableRow).append($(rowDetail)).appendTo($(caseBox));

    let casedatetime = caseBody.create_datetime.split(' ');
    //let casedateSegment = casedatetime[0].split('-');
    //casedateSegment = casedateSegment.join('');
    //let casedate = formatStudyDate(casedateSegment);
    tableRow = $('<div style="display: table-row;"></div>');
		rowDetail = $('<div style="display: table-cell; width: 250px;"><b>วันที่ / เวลา</b></div><div style="display: table-cell">' + casedatetime[0] + ' / ' + casedatetime[1].substring(0, 5) + '</div>');
		$(tableRow).append($(rowDetail)).appendTo($(caseBox));

    tableRow = $('<div style="display: table-row"></div>');
		rowDetail = $('<div style="display: table-cell; width: 250px;"><b>ประเภทความด่วน</b></div><div style="display: table-cell">' + caseBody.urgent + '</div>');
		$(tableRow).append($(rowDetail)).appendTo($(caseBox));

    tableRow = $('<div style="display: table-row"></div>');
		rowDetail = $('<div style="display: table-cell; width: 250px;"><b>สถานะเคส</b></div><div style="display: table-cell">' + caseBody.status + '</div>');
		$(tableRow).append($(rowDetail)).appendTo($(caseBox));

    tableRow = $('<div style="display: table-row"></div>');
		rowDetail = $('<div style="display: table-cell; width: 250px;"><b>แพทย์เจ้าของไข้</b></div><div style="display: table-cell">' + caseBody.primary_dr + '</div>');
		$(tableRow).append($(rowDetail)).appendTo($(caseBox));

    tableRow = $('<div style="display: table-row"></div>');
		rowDetail = $('<div style="display: table-cell; width: 250px;"><b>รายละเอียดเคส</b></div>');
		$(tableRow).append($(rowDetail)).appendTo($(caseBox));

    let caseDetailBox = $('<div style="display: table-cell"></div>');
    $(caseDetailBox).appendTo($(tableRow));
    if (caseBody.detail.length < 100) {
      $(caseDetailBox).text(caseBody.detail);
    } else {
      let titleDetail = caseBody.detail.substring(0, 60);
      let titleBox = $('<div id="TitleBox" style="display: block;"></div>');
      $(titleBox).text(titleDetail + ' ...  ');
      let toggleCmd = $('<input type="button" value=" More "/>');
      $(toggleCmd).appendTo($(titleBox));
      let fullBox = $('<div id="FullBox" style="display: none;"></div>');
      $(fullBox).text(caseBody.detail);
      let hideMoreCmd = $('<input type="button" value=" Hide "/>');
      $(hideMoreCmd).appendTo($(fullBox));
      $(caseDetailBox).append($(titleBox));
      $(caseDetailBox).append($(fullBox));
      $(toggleCmd).click(function(evt){
        $(fullBox).show();
        $(titleBox).hide();
      });
      $(hideMoreCmd).click(function(evt){
        $(fullBox).hide();
        $(titleBox).show();
      });
    }

    dfd.resolve($(caseBox));

    return dfd.promise();
  //});
}

function doCreatePatientBox(caseBody) {
  //return new Promise(function(resolve, reject) {
    var dfd = $.Deferred();
    let patientBox = $('<div id="CaseBox" style="display: table; padding: 4px;"></div>');

    let tableRow = $('<div style="display: table-row;"></div>');
		let rowDetail = $('<div style="display: table-cell; width: 250px;"><b>HN</b></div><div style="display: table-cell">' + caseBody.hn + '</div>');
		$(tableRow).append($(rowDetail)).appendTo($(patientBox));

    tableRow = $('<div style="display: table-row;"></div>');
		rowDetail = $('<div style="display: table-cell; width: 250px;"><b>ชื่อผู้ป่วย(ไทย)</b></div><div style="display: table-cell">' + caseBody.patient_th + '</div>');
		$(tableRow).append($(rowDetail)).appendTo($(patientBox));

    tableRow = $('<div style="display: table-row;"></div>');
		rowDetail = $('<div style="display: table-cell; width: 250px;"><b>ชื่อผู้ป่วย(อังกฤษ)</b></div><div style="display: table-cell">' + caseBody.patient + '</div>');
		$(tableRow).append($(rowDetail)).appendTo($(patientBox));

    tableRow = $('<div style="display: table-row;"></div>');
		rowDetail = $('<div style="display: table-cell; width: 250px;"><b>เพศ / อายุ</b></div><div style="display: table-cell">' + caseBody.gender + ' / ' + caseBody.age + '</div>');
		$(tableRow).append($(rowDetail)).appendTo($(patientBox));

    tableRow = $('<div style="display: table-row;"></div>');
		rowDetail = $('<div style="display: table-cell; width: 250px;"><b>แผนก</b></div><div style="display: table-cell">' + caseBody.dept + '</div>');
		$(tableRow).append($(rowDetail)).appendTo($(patientBox));

    tableRow = $('<div style="display: table-row;"></div>');
    rowDetail = $('<div style="display: table-cell; width: 250px;"><b>สิทธิ์ผู้ป่วย</b></div><div style="display: table-cell">' + caseBody.rights_name + '</div>');
    $(tableRow).append($(rowDetail)).appendTo($(patientBox));

    tableRow = $('<div style="display: table-row;"></div>');
    rowDetail = $('<div style="display: table-cell; width: 250px;"><b>ประวัติผู้ป่วย</b></div>');
    $(tableRow).append($(rowDetail)).appendTo($(patientBox));
    let patientHistoryBox = $('<div style="display: table-cell"></div>');
    $(patientHistoryBox).appendTo($(tableRow));
    let patientHistories = caseBody.pn_history.split(',');
    const imgURL = 'https://radconnext.com/radconnext/inc_files/';
    patientHistories.forEach(function(img, i)  {
      if (img !== '') {
        let historyImage = $('<img width="80" height="auto" src="' + imgURL + img +'" style="cursor: pointer; padding: 10px;"/>');
        $(historyImage).appendTo($(patientHistoryBox));
        $(historyImage).click(function(evt){
          window.open(imgURL+img, '_blank');
        })
      }
    });

    dfd.resolve($(patientBox));

    return dfd.promise();
  //});
}

function doCreateDicomBox(caseBody) {
  //return new Promise(function(resolve, reject) {
    var dfd = $.Deferred();
    let dicomBox = $('<div id="DicomBox" style="display: table; padding: 4px;"></div>');

    let tableRow = $('<div style="display: table-row"></div>');
		let rowDetail = $('<div style="display: table-cell; width: 200px;"><b>ACC</b></div><div style="display: table-cell">' + caseBody.accession + '</div>');
		$(tableRow).append($(rowDetail)).appendTo($(dicomBox));

    tableRow = $('<div style="display: table-row"></div>');
		rowDetail = $('<div style="display: table-cell; width: 250px;"><b>Modality</b></div><div style="display: table-cell">' + caseBody.dicom_folder2 + '</div>');
		$(tableRow).append($(rowDetail)).appendTo($(dicomBox));

    tableRow = $('<div style="display: table-row"></div>');
		rowDetail = $('<div style="display: table-cell; width: 200px;"><b>Study Desc. / Protocol Name</b></div><div style="display: table-cell">' + caseBody.inc_scan_type + '</div>');
		$(tableRow).append($(rowDetail)).appendTo($(dicomBox));

    tableRow = $('<div style="display: table-row"></div>');
		rowDetail = $('<div style="display: table-cell; width: 200px;"><b>Dicom</b></div>');
    let openDicomCmd = $('<input type="button" value=" Open "/>');
    $(openDicomCmd).click(function(evt){
      doGetOrthancPort().then(function(response)  {
        const orthancStoneWebviewer = 'http://202.28.68.28:' + response.port + '/stone-webviewer/index.html?study=';
        let orthancwebapplink = orthancStoneWebviewer + caseBody.dicom_folder3;
        var ua = window.navigator.userAgent;
        var msie = ua.indexOf("MSIE ");
        if (msie >= 0) {
          alert('ต้องขออภัยในความไม่สะดวก\nเนื่องจาก Microsoft Internet Explorer ไม่รองรับการเปิดภาพ DICOM ด้วย Stone Web Viewer\nโปรดคัดลอกลิงค์ด้านล่างแล้วไปเปิดด้วย Google Chrome หรือ MS Edge');
          tableRow = $('<div style="display: table-row"></div>');
      		rowDetail = $('<div style="display: table-cell; width: 250px;"><b>Dicom Web Viewer Url</b></div>');
      		$(tableRow).append($(rowDetail)).appendTo($(dicomBox));
          let dicomWebViewerLink = '<a href="' + orthancwebapplink + '" target="_blank">' + orthancwebapplink + '</a>';
          let dicomWebViewerLinkCell = $('<div style="display: table-cell">' + dicomWebViewerLink + '</div>');
          $(dicomWebViewerLinkCell).appendTo($(tableRow));
        } else {
          window.open(orthancwebapplink, '_blank');
        }
      });
    });
		$(tableRow).append($(rowDetail)).appendTo($(dicomBox));
    $(openDicomCmd).appendTo($(tableRow));

    dfd.resolve($(dicomBox));
    return dfd.promise();
  //});
}

function doCreateResultBox(caseBody) {
  //return new Promise(function(resolve, reject) {
    var dfd = $.Deferred();
    let resultBox = $('<div id="AllResultBox"></div>');
    //let patientNameEN = caseBody.dicom_zip2.split(' ').join('_');
    let patientNameEN = caseBody.patient.split(' ').join('_');
    let caseId = caseBody.id;
    //var promiseList = new Promise(function(inResolve, inReject){
      caseBody.result_data.forEach(function(item, i) {
        doCreateEachResult(item, patientNameEN, caseId).then(function(eachResult){
          $(resultBox).append($(eachResult));
        });
      });
      //setTimeout(function() {
        //inResolve($(resultBox));
        dfd.resolve($(resultBox));
      //}, 6600);
    //});
    //Promise.all([promiseList]).then(function(ob){
      //resolve(ob[0]);
    //});
  //});
  return dfd.promise();
}

function doCreateEachResult(resultBody, patientNameEN, caseId){
  //return new Promise(function(resolve, reject) {
    var dfd = $.Deferred();
    let resultBox = $('<div style="display: table; padding: 4px;"></div>');
    let resultdatetime = resultBody.response_datetime.split(' ');
    //let resultdateSegment = resultdatetime[0].split('-');
    //resultdateSegment = resultdateSegment.join('');
    //let resultdate = formatStudyDate(resultdateSegment);
    let tableRow = $('<div style="display: table-row;"></div>');
		let rowDetail = $('<div style="display: table-cell; width: 250px;"><b>วันที่ / เวลา</b></div><div style="display: table-cell">' + resultdatetime[0] + ' / ' + resultdatetime[1].substring(0, 5) + '</div>');
		$(tableRow).append($(rowDetail)).appendTo($(resultBox));
    tableRow = $('<div style="display: table-row;"></div>');
		rowDetail = $('<div style="display: table-cell; width: 250px;"><b>รังสีแพทย์</b></div><div style="display: table-cell">' + resultBody.dr_name + '</div>');
		$(tableRow).append($(rowDetail)).appendTo($(resultBox));

    tableRow = $('<div style="display: table-row"></div>');
		rowDetail = $('<div style="display: table-cell; width: 200px;"><b>Report</b></div>');
    $(tableRow).append($(rowDetail)).appendTo($(resultBox));

    doDownloadResult(resultBody.re_url, patientNameEN, resultdatetime[0], caseId).then(function(pdfurl){
      let thumnailBox = $('<div style="padding: 3px; text-align: center; background-color: #E0E4DE;"></div>');
      $(thumnailBox).appendTo($(tableRow));
      let embDiv = $('<a href="' + pdfurl.pdf.link + '" target="_blank"><img src="' + pdfurl.png.link + '" width="780" height="auto"/></a>');
      $(embDiv).appendTo($(thumnailBox));

      dfd.resolve($(resultBox));
    });

    return dfd.promise();

  //});
}

function doCreateZoomCaller(caseBody) {
  let zoomCallButton = $('<img data-toggle="tooltip" src="../images/zoom-logo.png" title="Call to Radiologist by your zoom app."/>');
  $(zoomCallButton).css({"width":"50px", "heigth": "auto", "cursor": "pointer", "margin-top": "4px"});
  $(zoomCallButton).click(function(evt) {
    $('body').loading('start');
    let hospitalName = cookie.org[0].name;
    let patientNameEN = caseBody.dicom_zip2.split(' ').join('_');
    let patientHN = caseBody.hn;
    let protocolName = caseBody.inc_scan_type;
    let casedatetime = caseBody.create_datetime.split(' ');
    let casedateSegment = casedatetime[0].split('-');
    casedateSegment = casedateSegment.join('');
    let casedate = formatStudyDate(casedateSegment);

    let startMeetingTime = formatStartTimeStr();
    doGetZoomMeeting(caseBody, startMeetingTime, hospitalName).then(function(zoomMeeting){
      console.log('zoomMeeting=>', zoomMeeting);
      let radioMsg = hospitalName + ' เชิญ conference case\n';
      radioMsg += patientNameEN + patientHN + protocolName + casedate + '\n';
      radioMsg += zoomMeeting.join_url + '\n';
      radioMsg += zoomMeeting.password + '\n';
      radioMsg += 'https://www.radconnext.com/radconnext/incident_input_result.php?id=' + caseBody.id;
      let radioId = caseBody.result_data[0].dr_id;
      let apiName = 'send_dr_msg';
  		const body = { id: radioId, msg: radioMsg};
  		var realUrl = apiHostURL + apiName + '.php';
  		var params = {method: 'post', body: body, url: realUrl, apiname: apiName};
      console.log(params);
      doCallApiByProxy(apiName, params).then(function(apiRes) {
        console.log(apiRes);
        alert('ระบบฯ ได้ทำการติดต่อขอเชิญรังสีแพทย์ในเคสนี้เข้าร่วม Zoom Conference แล้ว\nคุณสามารถเริ่ม Conference ได้ในหน้าที่กำลังเปิดขึ้นมาใหม่');
        window.open(zoomMeeting.start_url, '_blank');
        $('body').loading('stop');
      });
    });
  });
  return $(zoomCallButton);
}

function doCreateMessageSender(caseBody) {
  let sendMessageButton = $('<img data-toggle="tooltip" src="../images/messager-logo.png" title="Send message to Radiologist"/>');
  $(sendMessageButton).css({"width":"50px", "heigth": "auto", "cursor": "pointer", "margin-top": "4px"});
  $(sendMessageButton).click(function(evt) {
    $('.mainfull').find('#YourMessage').val('');
    $('.mainfull').find('#MessageInput').slideDown();
  });
  return $(sendMessageButton);
}

function doCreateMessageInput(caseBody) {
  let msgInputDiv = $('<div id="MessageInput" style="display: none; border: 2px solid black; background-color: #E0E4DE; padding: 5px;"></div>');
  let msgInputBox = $('<input type="text" id="YourMessage" size="50"/>');
  let sendCmd = $('<input type="button" value=" Send "/>');
  let cancelCmd = $('<input type="button" value=" Cancel "/>');
  $(msgInputDiv).append('<p>ป้อนข้อความที่ต้องการส่งไปหารังสีแพทย์ แล้วคลิกปุ่ม <b>Send</b></p>');
  $(msgInputDiv).append($(msgInputBox));
  $(msgInputDiv).append('<span>  </span>').append($(sendCmd));
  $(msgInputDiv).append('<span>  </span>').append($(cancelCmd));
  $(cancelCmd).click(function(){
    $('.mainfull').find('#MessageInput').slideUp();
  })
  $(sendCmd).click(function(){
    let yourMessage = $(msgInputBox).val();
    if (yourMessage !== '') {
      $(msgInputBox).css({'border': ''});
      $('body').loading('start');
      let hospitalName = cookie.org[0].name;
      let patientNameEN = caseBody.dicom_zip2.split(' ').join('_');
      let patientHN = caseBody.hn;
      let protocolName = caseBody.inc_scan_type;
      let casedatetime = caseBody.create_datetime.split(' ');
      let casedateSegment = casedatetime[0].split('-');
      casedateSegment = casedateSegment.join('');
      let casedate = formatStudyDate(casedateSegment);

      let radioMsg = hospitalName + ' ส่งคำถาม\n';
      radioMsg += patientNameEN + patientHN + protocolName + casedate + '\n';
      radioMsg += yourMessage + '\n';
      radioMsg += 'https://www.radconnext.com/radconnext/incident_input_result.php?id=' + caseBody.id;
      let radioId = caseBody.result_data[0].dr_id;
      let apiName = 'send_dr_msg';
  		const body = { id: radioId, msg: radioMsg};
  		var realUrl = apiHostURL + apiName + '.php';
  		var params = {method: 'post', body: body, url: realUrl, apiname: apiName};
      console.log(params);
      doCallApiByProxy(apiName, params).then(function(apiRes) {
        console.log(apiRes);
        alert('ระบบฯ ไดส่งข้อความของคุณไปหารังสีแพทย์ในเคสนี้แล้ว');
        $('body').loading('stop');
        $('.mainfull').find('#MessageInput').slideUp();
      });
    } else {
      $(msgInputBox).css({'border': '1px solid red'});
    }
  })

  return $(msgInputDiv);
}

/*
  Zoom API Section
*/

const zoomUserId = 'vwrjK4N4Tt284J2xw-V1ew';

const meetingType = 2; // 1, 2, 3, 8
const totalMinute = 15;
const meetingTimeZone = "Asia/Bangkok";
const agenda = "RADConnext";
const joinPassword = "RAD1234";

const meetingConfig ={
  host_video: false,
  participant_video: true,
  cn_meeting: false,
  in_meeting: false,
  join_before_host: true,
  mute_upon_entry: false,
  watermark: false,
  use_pmi: false,
  waiting_room: false,
  approval_type: 0, // 0, 1, 2
  registration_type: 1, // 1, 2, 3
  audio: "both",
  auto_recording: "none",
  alternative_hosts: "",
  close_registration: true,
  //global_dial_in_countries: true,
  registrants_email_notification: false,
  meeting_authentication: false,
}

const doGetZoomMeeting = function(incident, startMeetingTime, hospitalName) {
  //return new Promise(function(resolve, reject) {
    var dfd = $.Deferred();
    let reqParams = {};
    reqParams.zoomUserId = zoomUserId;
		var realUrl = zoomProxyReqURL + '/api/zoom/listmeeting';
		var params = {method: 'post', body: reqParams, url: realUrl};
    doCallZoomApiByProxy(params).then(function(proxyRes) {
      let meetingsRes = proxyRes.res.body
      realUrl = zoomProxyReqURL + '/api/zoom/getmeeting';
      reqParams = {};
      let meetings = meetingsRes.response.meetings;
      let readyMeetings = [];
      //var promiseList = new Promise(function(inResolve, inReject){
        meetings.forEach(function(item, i)  {
          reqParams.meetingId = item.id;
          params = {method: 'post', body: reqParams, url: realUrl};
          doCallZoomApiByProxy(params).then(function(yourProxyRes){
            console.log(yourProxyRes);
            let meetingRes = yourProxyRes.res.body;
            if (meetingRes.response) {
              if (meetingRes.response.status === 'waiting') {
                readyMeetings.push(item);
                return;
              } else if (meetingRes.response.status === 'end') {
                realUrl = zoomProxyReqURL + '/api/zoom/deletemeeting';
                params = {method: 'post', body: reqParams, url: realUrl};
                doCallZoomApiByProxy(params).then(function(yourProxyRes){
                  meetingRes = yourProxyRes.res.body;
                });
              }
            } else {
              return;
            }
          });
        });
        //setTimeout(function() {
          //inResolve(readyMeetings);
        //}, 1200);
      //});
      //Promise.all([promiseList]).then(function(ob){
      setTimeout(function() {
        let patientFullNameEN = incident.patient;
        //incident.case.patient.Patient_NameEN + ' ' + incident.case.patient.Patient_LastNameEN;
        if (readyMeetings.length >= 1) {
          let readyMeeting = readyMeetings[0];
          //update meeting for user
          let joinTopic = 'โรงพยาบาล' + hospitalName + ' ผู้ป่วยชื่อ ' + patientFullNameEN;
          let startTime = startMeetingTime;
          let zoomParams = {
            topic: joinTopic,
            type: meetingType,
            start_time: startTime,
            duration: totalMinute,
            timezone: meetingTimeZone,
            password: joinPassword,
            agenda: agenda
          };
          zoomParams.settings = meetingConfig;
          reqParams.params = zoomParams;
          realUrl = zoomProxyReqURL + '/api/zoom/updatemeeting';
          params = {method: 'post', body: reqParams, url: realUrl};
          doCallZoomApiByProxy(params).then(function(yourProxyRes){
            let meetingRes = yourProxyRes.res.body;
            console.log('update result=>', meetingRes);
            realUrl = zoomProxyReqURL + '/api/zoom/getmeeting';
            reqParams = {meetingId: readyMeeting.id};
            params = {method: 'post', body: reqParams, url: realUrl};
            doCallZoomApiByProxy(params).then(function(yourProxyRes){
              meetingRes = yourProxyRes.res.body;
              console.log('updated result=>', meetingRes);
              dfd.resolve(meetingRes.response);
            });
          });
        } else {
          //create new meeting
          realUrl = zoomProxyReqURL + '/api/zoom/createmeeting';
          reqParams.zoomUserId = zoomUserId;
          let joinTopic =  'โรงพยาบาล' + hospitalName + ' ผู้ป่วยชื่อ ' + patientFullNameEN;
          let startTime = startMeetingTime;
          let zoomParams = {
            topic: joinTopic,
            type: meetingType,
            start_time: startTime,
            duration: totalMinute,
            timezone: meetingTimeZone,
            password: joinPassword,
            agenda: agenda
          };
          zoomParams.settings = meetingConfig;
          reqParams.params = zoomParams;
          params = {method: 'post', body: reqParams, url: realUrl};
          doCallZoomApiByProxy(params).then(function (proxyRes){
            let meetingsRes = proxyRes.res.body;
            console.log('create meetingsRes=>', meetingsRes);
            realUrl = zoomProxyReqURL + '/api/zoom/getmeeting';
            reqParams = {};
            reqParams.meetingId = meetingsRes.response.id;
            params = {method: 'post', body: reqParams, url: realUrl};
            doCallZoomApiByProxy(params).then(function(zoomPoxyRes){
              let meetingRes = proxyRes.res.body;
              console.log('create meetingRes=>', meetingRes);
              dfd.resolve(meetingRes.response);
            });
          });
        }
      }, 7200);
      //});
    });
    return dfd.promise();
  //});
}

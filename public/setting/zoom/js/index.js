
ZoomMtg.setZoomJSLib('https://dmogdx0jrul3u.cloudfront.net/1.8.1/lib', '/av');
//ZoomMtg.setZoomJSLib('../../../lib/zoom/lib', '/av');

ZoomMtg.preLoadWasm();
ZoomMtg.prepareJssdk

const zoomMeeting = document.getElementById("zmmtg-root");
//const leaveUrl = 'https://' + window.location.host + '/api/zoom/meetingEnd';
const leaveUrl = '/index.html';
const meetingNumber = 88311164881;
const role = 0;
const userName = 'Pongsakorn Songkran';
const userEmail = 'oudsoft@gmail.com';

const meetConfig = {
    leaveUrl: leaveUrl,
    meetingNumber: meetingNumber,
    role: role,
    userName: userName,
    userEmail: userEmail,
    passWord: '5s3aJp'
};

const doCallApi = function (apiurl, params) {
  return new Promise(function(resolve, reject) {
    $.post(apiurl, params, function(data){
      resolve(data);
    }).fail(function(error) {
      reject(error);
    });
  });
}

const doGetApi = function (apiurl, params) {
  return new Promise(function(resolve, reject) {
    $.get(apiurl, params, function(data){
      resolve(data);
    }).fail(function(error) {
      reject(error);
    });
  });
}

function doAppendRootElem(){
  let rootElem = $('<div id="zmmtg-root"></div>');
  let ariaNotifyElem = $('<div id="aria-notify-area"></div>');
  $('body').append($(rootElem));
  $('body').append($(ariaNotifyElem));
}

function doAppendReactModalPortal(){
  $('body').append('<div class="ReactModalPortal"></div>');
  $('body').append('<div class="ReactModalPortal"></div>');
  $('body').append('<div class="ReactModalPortal"></div>');
  $('body').append('<div class="ReactModalPortal"></div>');
  $('body').append('<div class="global-pop-up-box"></div>');
  //$('body').append('<div class="sharer-controlbar-container sharer-controlbar-container--hidden"></div>');
  $('body').addClass('ReactModal__Body--open');
}

function doCallSignature() {
  let reqParams = {meetingNumber: meetingNumber, role: role};
  let reqUrl = '/api/zoom/signature';
  doCallApi(reqUrl, reqParams).then((signatureRes)=>{
    console.log('Your Signature => ', signatureRes);
    console.log('Your Metting Conf => ', meetConfig);
    ZoomMtg.init({
      leaveUrl: meetConfig.leaveUrl,
      webEndpoint: meetConfig.webEndpoint,
      isSupportAV: true,
      /*
      screenShare: true,
      isSupportChat: true,
      */
      success: function() {
        console.log('text');
        ZoomMtg.join({
          signature: signatureRes.Signature,
          apiKey: signatureRes.apiKey,
          meetingNumber: meetConfig.meetingNumber,
          userName: meetConfig.userName,
          // password optional; set by Host
          passWord: meetConfig.passWord,
          error(res) {
            console.log(res)
          }
        })
      },
      fail: function(err){
        console.log(err);
      }
    });

  });
}

function formatStartTimeStr() {
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
    hh = '0' + getHours();
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
	var td = `${yy}-${mm}-${dd}T${hh}:${mn}:${ss}`;
	return td;
}

function doCallMeeting() {
  let reqParams = {};
  let reqUrl = '/api/zoom/zoomuser';
  doCallApi(reqUrl, reqParams).then((zoomUserRes)=>{
    console.log(zoomUserRes);
    let zoomUserId = zoomUserRes.response.users[0].id; //"vwrjK4N4Tt284J2xw-V1ew"
    reqUrl = '/api/zoom/meeting';
    reqParams.zoomUserId = zoomUserId;
    let joinPassword = "RAD1234";
    //let joinTopic = "Conference รพ.$hos_name เคส $inc_patient";
    let joinTopic = "Test Conference";
    let meetingType = 2; // 1, 2, 3, 8
    let totalMinute = 15;
    let meetingTimeZone = "Asia/Bangkok";
    let agenda = "RADConnext";
    let startTime = formatStartTimeStr();
    let zoomParams = {
      topic: joinTopic,
      type: meetingType,
      start_time: startTime,
      duration: totalMinute,
      timezone: meetingTimeZone,
      password: joinPassword,
      agenda: agenda
    };
    let meetingConfig ={
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
  		registration_type: 1, // 0, 1, 2
  		audio: "both",
  		auto_recording: "none",
  		alternative_hosts: "",
  		cloase_registration: true,
  		//global_dial_in_countries: true,
  		registrants_email_notification: false,
  		meeting_authentication: false,
    }
    zoomParams.settings = meetingConfig;
    reqParams.params = zoomParams;
    console.log(reqParams);
    doCallApi(reqUrl, reqParams).then((meetingRes)=>{
      console.log(meetingRes);
    });
  });
}

setTimeout(()=>{
  /*
  doAppendReactModalPortal();
  console.log(JSON.stringify(ZoomMtg.checkSystemRequirements()));
  doCallSignature();
  */
  doCallMeeting();
},2000)

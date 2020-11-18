const reportParams = {};

function doSetReportParams(hospitalId, caseId, userId){
  reportParams.hospitalId = hospitalId;
  reportParams.caseId = caseId;
  reportParams.userId = userId;
}

function doGetApi(url, params) {
  return new Promise(function(resolve, reject) {
    $.get(url, params, function(response){
      resolve(response);
    })
  });
}

function doCallApi(url, params) {
  return new Promise(function(resolve, reject) {
    $.post(url, params, function(response){
      resolve(response);
    })
  });
}

function doLoadReportVarialble(caseId, userId){
  return new Promise(function(resolve, reject) {
    let apiUrl = '/api/casereport/variable';
    let params = {caseId: caseId, userId: userId};
    doCallApi(apiUrl, params).then((result) => {
      resolve(result);
    });
  });
}

function doMergeContent(elements, variable, qrcodeLink, cb){
  let wrapper = $("#report-wrapper").empty();
  //let variable = reportVar.variable;
  //let elements = content.Records[0].Content;
  elements.forEach((item, i) => {
    if (item.elementType === 'text'){
      if (item.type === 'dynamic'){
        const field = item.title.substring(1);
        switch (field) {
          case 'hospital_name':
            item.title = variable.hospital_name;
          break;
          case 'patient_name':
            item.title = variable.patient_name;
          break;
          case 'patient_name_th':
            item.title = variable.patient_name_th;
          break;
          case 'patient_name_en_th':
            item.title = variable.patient_name_en_th;
          break;
          case 'patient_hn':
            item.title = variable.patient_hn;
          break;
          case 'patient_gender':
            item.title = variable.patient_gender;
          break;
          case 'patient_age':
            item.title = variable.patient_age;
          break;
          case 'patient_rights':
            item.title = variable.patient_rights;
          break;
          case 'patient_doctor':
            item.title = variable.patient_doctor;
          break;
          case 'patient_dept':
            item.title = variable.patient_dept;
          break;
          case 'result':
            item.title = variable.result;
          break;
          case 'report_by':
            item.title = variable.report_by;
          break;
          case 'report_datetime':
            item.title = variable.report_datetime;
          break;
          case 'scan_date':
            item.title = variable.scan_date;
          break;
          case 'scan_protocol':
            item.title = variable.scan_protocol;
          break;
        }
        item.field = field;
      }
    }
  });

  setTimeout(()=> {
    let formatedContents = elements;
    formatedContents.forEach((item, i) => {
      doCreateElement(wrapper, item.elementType, item);
    });
    if (qrcodeLink) {
      let qrcodeElem = {url: qrcodeLink, x: 10, y: 1310, width: 100};
      doCreateElement(wrapper, 'image', qrcodeElem);
    }
    setTimeout(()=> {
      cb($(wrapper).html());
    },500);
  },500);
}

function doLoadReportFormat(hosId){
  return new Promise(function(resolve, reject) {
    let apiUrl = '/api/hospitalreport/select/' + hosId;
    let params = {hospitalId: reportParams.hospitalId, userId: reportParams.userId};
    doGetApi(apiUrl, params).then((result) => {
      let content = result.Records[0].Content;
      doLoadReportVarialble(reportParams.caseId, reportParams.userId).then((reportVar)=>{
        const promiseList = new Promise(function(resolve1, reject1) {
          let variable = reportVar.variable;
          let elements = content;
          elements.forEach((item, i) => {
            if (item.elementType === 'text'){
              if (item.type === 'dynamic'){
                const field = item.title.substring(1);
                switch (field) {
                  case 'hospital_name':
                    item.title = variable.hospital_name;
                  break;
                  case 'patient_name':
                    item.title = variable.patient_name;
                  break;
                  case 'patient_name_th':
                    item.title = variable.patient_name_th;
                  break;
                  case 'patient_name_en_th':
                    item.title = variable.patient_name_en_th;
                  break;
                  case 'patient_hn':
                    item.title = variable.patient_hn;
                  break;
                  case 'patient_gender':
                    item.title = variable.patient_gender;
                  break;
                  case 'patient_age':
                    item.title = variable.patient_age;
                  break;
                  case 'patient_rights':
                    item.title = variable.patient_rights;
                  break;
                  case 'patient_doctor':
                    item.title = variable.patient_doctor;
                  break;
                  case 'patient_dept':
                    item.title = variable.patient_dept;
                  break;
                  case 'result':
                    item.title = variable.result;
                  break;
                  case 'report_by':
                    item.title = variable.report_by;
                  break;
                  case 'report_datetime':
                    item.title = variable.report_datetime;
                  break;
                  case 'scan_date':
                    item.title = variable.scan_date;
                  break;
                  case 'scan_protocol':
                    item.title = variable.scan_protocol;
                  break;
                }
              }
            }
          });
          setTimeout(()=> {
            resolve1(elements);
          },500);
        });
        Promise.all([promiseList]).then((ob)=> {
          let formatedContents = ob[0];
          const promiseListFinal = new Promise(function(resolve2, reject2) {
            formatedContents.forEach((item, i) => {
              doCreateElement(wrapper, item.elementType, item);
            });
            setTimeout(()=> {
              resolve2($(wrapper).html());
            },500);
          });
          Promise.all([promiseListFinal]).then((obb)=> {
            resolve(obb[0]);
          });
        });
      });
    });
  });
}

function doCreateElement(wrapper, elemType, elem){
  let element;
  switch (elemType) {
    case "text":
      element = $("<div></div>");
      $(element).addClass("reportElement");
      $(element).css({"left": elem.x + "px", "top": elem.y + "px", "width": elem.width + "px", "height": elem.height + "px"});
      $(element).css({"font-size": elem.fontsize + "px"});
      $(element).css({"font-weight": elem.fontweight});
      $(element).css({"font-style": elem.fontstyle});
      $(element).css({"text-align": elem.fontalign});
      if (elem.field === 'result') {
        $(element).html(elem.title);
      } else {
        $(element).text(elem.title);
      }
    break;
    case "hr":
      element = $("<div><hr/></div>");
      $(element).addClass("reportElement");
      $(element).css({"left": elem.x + "px", "top": elem.y + "px", "width": elem.width, "height": elem.height + "px"});
      $(element > "hr").css({"border": elem.border});
    break;
    case "image":
      element = $("<div></div>");
      $(element).addClass("reportElement");
      let newImage = new Image();
      newImage.src = elem.url;
      newImage.setAttribute("width", elem.width);
      $(element).append(newImage);
      $(element).css({"left": elem.x + "px", "top": elem.y + "px", "width": elem.width, "height": "auto"});
    break;
  }
  $(element).appendTo($(wrapper));
}

$( document ).ready(function() {
  $.ajaxSetup({
    beforeSend: function(xhr) {
      xhr.setRequestHeader('Authorization', localStorage.getItem('token'));
    }
  });
});

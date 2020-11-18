/* casetask.js */

function RadconCaseTask (socket, db, log) {
  const $this = this;
  const cron = require('node-cron');

	this.caseTasks = [];

/*
  1. new case สร้าง task เพื่อจับเวลาการ accept
  2. ถ้า accept ทันเวลา เปลี่ยนสถานะเป็น รอผลอ่าน ลบ task ข้อ 1 แล้วสร้าง task ใหม่เพื่อจับเวลา working
  3. ภ้าส่งผลอ่านทันเวลา เปลี่ยนสถานะเป็น ได้ผลอ่านแล้ว ลบ task ข้อ 2 ลบ task ข้อ 1
  4. ถ้่า accept ไม่ทันเวลา เปลี่ยนสถานะเป็น expired ลบ task ข้อ 1
  5. ถ้าส่งผลอ่านไม่ทันเวลา เปลี่ยนสถานะเป็น expired ลบ task ข้อ 2
  tasks Model {caseId, statusId, triggerAt: datetime, task<cron.schedule>}
*/

  this.doCreateNewTask = async function (caseId, username, triggerParam, radioUsername, hospitalId, cb) {
    const startDate = new Date();
    const day = Number(triggerParam.dd) * 24 * 60 * 60 * 1000;
    const hour = Number(triggerParam.hh) * 60 * 60 * 1000;
    const minute = Number(triggerParam.mn) * 60 * 1000;
    let endDate = new Date(startDate.getTime() + day + hour + minute);
    let endMM = endDate.getMonth() + 1;
    let endDD = endDate.getDate();
    let endHH = endDate.getHours();
    let endMN = endDate.getMinutes();
    let endSS = endDate.getSeconds();
    let scheduleTrigger = endSS + ' ' + endMN + ' ' + endHH + ' ' + endDD + ' ' + endMM + ' *';
		let task = cron.schedule(scheduleTrigger, function(){
      cb(caseId, socket);
    });
    let hoses = await db.hospitals.findAll({attributes: ['Hos_Name'], where: {id: hospitalId}});
    let newTask = {caseId: caseId, username: username, radioUsername: radioUsername, triggerAt: endDate/*, task: task*/};
    $this.caseTasks.push(newTask);
    let msg = 'You have a new Case on ' + hoses[0].Hos_Name + '. This your case will be expire at ' + endDate.getFullYear() + '-' + endMM + '-' + endDD + ' : ' + endHH + '.' + endMN;
    let notify = {type: 'notify', message: msg};
    let canSend = socket.sendMessage(notify, radioUsername);
    if (canSend) {
      msg = 'The Radiologist of your new case can recieve message of this your case, And this case will be expire at ' + endDate.getFullYear() + '-' + endMM + '-' + endDD + ' : ' + endHH + '.' + endMN;
    } else {
      msg = 'The Radiologist of your new case can not recieve message of this your case, And this case will be expire at ' + endDate.getFullYear() + '-' + endMM + '-' + endDD + ' : ' + endHH + '.' + endMN;
    }
    notify = {type: 'notify', message: msg};
    socket.sendMessage(notify, username);
  }

  this.removeTaskByCaseId = async function (caseId) {
    log.info('$this.caseTasks==> ' + JSON.stringify($this.caseTasks));
    let anotherTasks = await $this.caseTasks.filter((task)=>{
      if (task.caseId !== caseId) {
        return task;
      }
    });
    log.info('anotherTasks==> ' + JSON.stringify(anotherTasks));
    $this.caseTasks = anotherTasks;
    log.info('$this.caseTasks==> ' + JSON.stringify($this.caseTasks));
  }

  this.getTasks = function(){
    return $this.caseTasks;
  }

  this.runCommand = function (command) {
		return new Promise(function(resolve, reject) {
			const exec = require('child_process').exec;
			exec(command, (error, stdout, stderr) => {
				if(error === null) {
					resolve(`${stdout}`);
				} else {
					reject(`${stderr}`);
				}
	    });
		});
	}

}

module.exports = ( websocket, db, monitor ) => {
	const taskcase = new RadconCaseTask(websocket, db, monitor);
  return taskcase;
}

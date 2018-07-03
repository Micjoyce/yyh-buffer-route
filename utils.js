'use strict';

let _ = require('lodash')
let config = require('./config');
let Converter = require("csvtojson").Converter;
let converter = new Converter({});
let converterTwo = new Converter({});
let combinFlag = config.combinFlag;
let bufferName = config.bufferName;
let supPoints = require('./supPoints');
let affectedPoint = require('./points');

module.exports = {
	iterationResult(initResult, cars) {
		let len = cars.length;
		let self = this;
		let randomCarPosition = parseInt(Math.random() * len);
		let originCarCode = cars[randomCarPosition].carCode;
		// 找出车辆编号
		let carCodes = _.map(initResult, "carCode");
		let findCarPosition = parseInt(Math.random() * carCodes.length);
		let replacedCarCode = carCodes[findCarPosition];
		// 如果要替换的车与之前的相同则返回
		if (originCarCode === replacedCarCode) {
			return initResult;
		}
		// 找到最大那辆车的位置进行替换
		let replacePosition = self.findCarCodeMaxPosition(replacedCarCode, initResult);
		// 进行数据替换
		let replaceResult = self.replaceResult(originCarCode, replacePosition, initResult);
		return replaceResult;
	},
	replaceResult(originCarCode, replacePosition, initResult) {
		//originCarCode 找出是否在这个数据中，如果不在则直接替换，添加step为1
		//如果存在的话则替换添加最大值＋1的step
		let result = [].concat(initResult);
		let findExsit = _.filter(result, function(point, index) {
			return point.carCode === originCarCode;
		});
		// 如果存在
		let point = result[replacePosition];
		point.carCode = originCarCode;
		if (findExsit.length > 0) {
			point.step = findExsit.length + 1;
		} else {
			point.step = 1;
		}
		result[replacePosition] = point;
		return result;
	},
	findCarCodeMaxPosition(carCode, initResult) {
		let position = 0;
		let init = 0;
		initResult.forEach(function(point, index) {
			if (point.carCode === carCode) {
				if (point.step >= init) {
					init = point.step;
					position = index;
				}
			}
		});
		return position;
	},
	csvToJson(fileUrl, callback) {
		if (!_.isString(fileUrl) || !_.isFunction(callback)) {
			return console.log(`文件名:${fileUrl}, 回调函数${callback}`);
		}
		converter.fromFile(fileUrl ,function(err,result){
			callback(err, result);
		});
	},
	csvToJsonTwo(fileUrl, callback) {
		if (!_.isString(fileUrl) || !_.isFunction(callback)) {
			return console.log(`文件名:${fileUrl}, 回调函数${callback}`);
		}
		converterTwo.fromFile(fileUrl ,function(err,result){
			callback(err, result);
		});
	},
	initPointDistance(disArr, mainKeyName){
		if (!_.isArray(disArr)) {
			return console.log((`${disArr}不是一个数组`));
		}
		let name = mainKeyName || "name";
		let result = {};
		let len = disArr.length;
		for (let i = 0; i < len; i++) {
			let item = disArr[i];
			let firstKey = item[name].toString();
			delete item[name];
			let allKeys = _.keys(item);
			allKeys.forEach(function(key, index){
				let val = item[key];
				key = key.toString();
				if (firstKey === key) {
					val = 0;
				}
				if (val === "") {
					let mirrorKey = key + combinFlag + firstKey;
					val = result[mirrorKey];
				}
				let combinKey = firstKey + combinFlag + key;
				result[combinKey] = val;
			});
		}
		return result;
	},
	getDistance(firstKey, lastKey, distances) {
		if (!firstKey || !lastKey || !distances) {
			return console.log(`firstKey:${firstKey},lastKey: ${lastKey},distances:${distances}`);
		}
		let key = firstKey + combinFlag + lastKey;
		let disVal = distances[key];
		if (!disVal && disVal !== 0) {
			let reverseKey = lastKey + combinFlag + firstKey;
			disVal = distances[reverseKey];
		}
		if (!disVal && disVal !== 0) {
			console.log(`get distances key Error, firstKey:${firstKey},lastKey: ${lastKey}`);
		}
		return disVal;
	},
	initCarsRoutes(initCars, initResult) {
		if (!initCars || !initResult) {
			return console.log(`Error: cars: ${cars}, initResult: ${initResult}`);
		}
		// 深度复制initCars
		let calcCars = JSON.parse(JSON.stringify(initCars));
		// 遍历所有车辆，然后根据carCode找出初始化结果中该车需要到达的点
		// 如果没有找到，则该车为到buffer点的车
		calcCars.forEach(function(car, index){
			let points = _.filter(initResult, function(points) {
				return car.carCode === points.carCode;
			});
			// 如果没有找到则标志为到buffer的车辆
			if (points.length === 0) {
				car.routes = [];
				car.goBuffer = true;
			} else {
				// 对到达点根据 step 字段进行升序排序
				points.sort(function(itema, itemb){
					return itema.step > itemb.step;
				});
				let routes = _.map(points, 'pCode');
				car.routes = routes;
			}
		});
		return calcCars;
	},
	calcCarTouchBuffer(car, points, distances) {
		if (!car || !points || !distances) {
			return console.log(`calcCarTouchBuffer Error, car: ${car}, points: ${points}, distances: ${distances}`);
		}
		let self = this;
		let routes = car.routes;
		if (!car.goBuffer && (!routes || routes.length < 1)) {
			return console.log(`car: ${car.carCode}, routes Error`);
		}
		// 如果在起始点出发时则为零，设置起始点为第一个到达点, 并且设置其初始化的的数量volume
		if (!car.arrives || car.arrives.length === 0) {
			car.arrives = [car.ownerSupply];
			car.perPointVolume = [];
			car.volume = car.load;
			car.supVolume = 0;
			car.notEnough = 0;
			car.lastFinshPoint = car.ownerSupply;
			car.bufferNeedVolumes = [];
		}
		//
		let stopLoop = true;
		while(stopLoop) {
			// 如果最后到达点等于routes的最后一个到达点，且notEnough等于0 则结束循环
			let isLastPoint = self.isLastPoint(car);
			if (isLastPoint && car.notEnough === 0) {
				stopLoop = false;
			} else {
				// 如果存在notEnough 大于0，则说明此车仔这个点需要到达buffer去获取物资，不继续进行下一步运输。
				if (car.notEnough > 0) {
					// 需要去一次buffer点进行装载，假设不需要等待，等待时间在最后结果进行添加
					car  = self.goToBuffer(car);
				} else{
					let route = self.getNextRoute(car);
					let needVolume = _.map(_.filter(points, function(point){
						return point.code === route;
					}), 'needVolume')[0];
					// 更新car的volume
					car = self.updateCarVolume(car, needVolume, route);
				}
			}
		}
		// console.log(car.arrives)
		return car;
	},
	getNextRoute(car) {
		let routeLen = car.routes.length;
		if (routeLen === 1) {
			return car.routes[0];
		}
		let index = car.routes.indexOf(car.lastFinshPoint);
		return car.routes[index + 1];
	},
	isLastPoint(car) {
		// if (car.carCode === 'S1-A-3') {
		// 	console.log(car);
		// 	console.log(car.routes[car.routes.length - 1] === car.arrives[car.arrives.length - 1]);
		// }
		return car.routes[car.routes.length - 1] === car.arrives[car.arrives.length - 1];
	},
	updateCarVolume(car, needVolume, route) {
		if (car.volume >= needVolume) {
			car.arrives.push(route);
			car.perPointVolume.push(needVolume)
			car.supVolume += needVolume;
			car.volume -= needVolume;
			car.lastFinshPoint = route;
			return car;
		}
		// 当车上的数量小于需求量时则卸载下当前的量，设置notEnough的量
		car.arrives.push(route);
		car.perPointVolume.push(car.volume);
		car.supVolume += car.volume;
		car.notEnough = needVolume - car.volume;
		car.volume = 0;
		return car;
	},
	goToBuffer(car) {
		let self = this;
		let isLastPoint = self.isLastPoint(car);
		let isLoadGreaterNeed = car.load > car.notEnough;
		// 判定是否为最后一个装载点，如果是装载最后一个点且需求量小于最大装载量则只装载最后一个点的需求量
		car.arrives.push(bufferName);
		let route = car.arrives[car.arrives.length - 2];
		car.arrives.push(route);
		if (isLoadGreaterNeed) {
			// 装载量大于此点的需求，并且为最后一个运输点
			if (isLastPoint) {
				car.volume = 0;
				car.supVolume += car.notEnough;
				car.perPointVolume.push(car.notEnough);
				car.bufferNeedVolumes.push(car.notEnough);
				car.notEnough = 0;
			} else {
				car.volume = car.load - car.notEnough;
				car.supVolume += car.notEnough;
				car.perPointVolume.push(car.notEnough);
				car.notEnough = 0;
				car.bufferNeedVolumes.push(car.load);
			}
		} else {
			if (car.load > car.notEnough) {
				car.volume = car.load - car.notEnough;
				car.supVolume += car.volume;
				car.perPointVolume.push(car.volume);
				car.notEnough -= car.load;
				car.bufferNeedVolumes.push(car.load);
			} else {
				car.volume = 0;
				car.supVolume += car.volume;
				car.perPointVolume.push(car.volume);
				car.notEnough -= car.load;
				car.bufferNeedVolumes.push(car.load);
			}
		}
		car.lastFinshPoint = route;
		return car;
	},
	findWays(points, pointCars, distances) {
		let self = this;
		if (!_.isArray(points) || !_.isArray(pointCars) || _.isArray(distances)) {
			return console.log(`输入错误: points:${points}, pointCars: ${pointCars}, distances:${distances}`);
		}
		// 找出各车的第一次到达buffer时候的状态
		let goCars = [];
		pointCars.forEach(function(car, index){
			let routeCar = self.calcCarTouchBuffer(car, points, distances);
			goCars.push(routeCar);
		});
		return goCars;
	},
	// 给出一个routes 计算这个routes的时间
	calcRoutesTime(routes, distances) {
		// [ 'Supply2', 'P8', 'Buffer1', 'P8', 'P10', 'Buffer1', 'P10', 'P9' ]
		if (!_.isArray(routes)) {
			return console.log(`routes: ${routes} Error`);
		}
		if (routes.length < 2) {
			console.log("routes length Error, routes length must greater than 2, routes:${routes}");
			return 0;
		}
		let self = this;
		let times = 0;
		for (let i = 1; i < routes.length; i++) {
			let time = self.getDistance(routes[i-1], routes[i], distances);
			if (!time) {
				console.log(`Error, calcRoutesTime, time: ${time}, i-1: ${routes[i-1]}, i:${routes[i]}`);
			} else {
				times += time;
			}
		}
		return times;
	},
	getBufferByRoutes(car, distances) {
		let self = this;
		let bufferRoute = [];
		let routes = car.arrives;
		let bufferCount = 0;
		for (let i = 0; i < routes.length; i++) {
			let route = routes[i];
			if (route === bufferName) {
				bufferCount ++;
				let rts =  routes.slice(0, i+1);
				let time = self.calcRoutesTime(rts, distances)
				bufferRoute.push({
					time: time,
					routes: rts,
					carCode: car.carCode,
					bufferNeedVolume: car.bufferNeedVolumes[bufferCount - 1],
				});
			}
		}
		return bufferRoute;
	},
	getBuffersByCar(hasGoToBufferCars, distances){
		if (!_.isArray(hasGoToBufferCars)) {
			return console.log(`setBufferTicks: ${hasGoToBufferCars} Error`);
		}
		let self = this;
		let bufferRoutes = [];
		for (let i = 0; i < hasGoToBufferCars.length; i++) {
			let car = hasGoToBufferCars[i];
			// 找到所有到达buffer的点，及其路由
			let bfRoutes = self.getBufferByRoutes(car, distances);
			bufferRoutes = bufferRoutes.concat(bfRoutes);
		}
		// 按照时间排序（升序）
		bufferRoutes = _.sortBy(bufferRoutes, ['time', 'bufferNeedVolume'], ['asc', 'desc']);
		return bufferRoutes;
	},
	initBufferCars(bufferCars, distances) {
		// 添加 goBufferTime到car对象上面
		if (!_.isArray(bufferCars)) {
			return console.log(`Error initBufferCars, bufferCars${bufferCars}`);
		}
		let self = this;
		let initBufferCars = [];
		bufferCars.forEach(function(car){
			// getDistance
			let dis = self.getDistance(car.ownerSupply, bufferName, distances);
			car.goBufferTime = dis;
			car.bufferName = bufferName;
			initBufferCars.push(car);
		});
		return initBufferCars;
	},
	getCountByTime(time, bufferCar){
		if (!time || !bufferCar) {
			return console.log(`getCountByTime Error, time:${time},bufferCar: ${bufferCar}`);
		}
		// { carCode: 'S1-A-2',
		//    type: 'A',
		//    load: 9,
		//    ownerSupply: 'Supply1',
		//    routes: [],
		//    goBuffer: true,
		//    goBufferTime: 18,
		//    bufferName: 'Buffer1' }
		let count = 0;
		if (time < bufferCar.goBufferTime) {
			return count;
		}
		count ++;
		let lessTime = time - bufferCar.goBufferTime;
		let moreCount = Math.floor(lessTime/(bufferCar.goBufferTime * 2));
		count += moreCount;
		return count;
	},
	getBufferVolumeByTime(time, bufferCars, distances) {
		let self = this;
		let initBufferCars = self.initBufferCars(bufferCars, distances);
		let bufferVolume = 0;
		let supMonit = {};
		initBufferCars.forEach(function (bufferCar) {
			let count = self.getCountByTime(time, bufferCar);
			// console.log(time, count, bufferCar.goBufferTime)
			let volume = count * bufferCar.load;
			if (!supMonit[bufferCar.ownerSupply]) {
				supMonit[bufferCar.ownerSupply] = volume;
			} else {
				supMonit[bufferCar.ownerSupply] += volume;
			}
		});
		// 需要做一个判断就是到达同一个sup点取物的车是否所获取的量已经超过了所能提供的量
		let keys = Object.keys(supMonit);
		keys.forEach(function(supName, index) {
			let supVolume = _.find(supPoints, function(point, index) {
				return point.name === supName;
			}).volume;
			if (supMonit[supName] > supVolume ) {
				bufferVolume += supVolume;
			} else {
				bufferVolume += supMonit[supName];
			}
		});
		// bufferVolume 为到某个时间点的量
		return bufferVolume;
	},
	generatorTimeTicks(totalNeedVolume, initBufferCars) {
		if (!totalNeedVolume || !initBufferCars) {
			return console.log(`generatorTimeTicks Error`);
		}
		let timeSerie = [];
		initBufferCars.forEach(function(car, index) {
			let count = Math.ceil(totalNeedVolume / car.load);
			for (let i = 1; i <= count; i++) {
				let time = (i - 1)*car.goBufferTime*2 + car.goBufferTime;
				timeSerie.push(time);
			}
			// if (index === 0) {
			// 	console.log(totalNeedVolume,car.load, timeSerie)
			// }
		});
		// 按照省需排序返回
		timeSerie.sort(function(a, b){
			return a - b;
		});
		// 移除0时刻
		timeSerie = _.filter(timeSerie, function(tick) {
			return tick !== 0;
		});
		return timeSerie;
	},
	getBufferNeedTimeByVolume(totalNeedVolume, bufferCars, distances){
		if (!totalNeedVolume || !bufferCars || !distances) {
			return console.log(`getBufferNeedTimeByVolume Error`);
		}
		let self = this;
		let initBufferCars = self.initBufferCars(bufferCars, distances);
		// 假设各车单独运送到达需求量货物时需要多少次，生成一个时间序列
		let timeSerie = self.generatorTimeTicks(totalNeedVolume, initBufferCars);

		let needTime = 0;
		for (let i = 0; i < timeSerie.length; i++) {
			let time = timeSerie[i]
			let volume = self.getBufferVolumeByTime(time, bufferCars, distances);
			if (totalNeedVolume < volume) {
				needTime = time;
				break;
			}
		}
		// console.log(totalNeedVolume, timeSerie, needTime, 'timeserie');
		return needTime;

	},
	refixeBufferRoutes(carBufferRoutes, bufferCars, distances) {
		// carBufferRoute
		// { time: 32.7,
		//   routes: [ 'Supply1', 'P7', 'Buffer1' ],
		//   carCode: 'S1-C-1',
		//   bufferNeedVolume: 6.3 }
		// 会添加一个字段 waitTime
		if (!carBufferRoutes || !bufferCars || !distances) {
			return console.log(`fixedBufferRoutes Error`);
		}
		const self = this;
		let initBufferCars = JSON.parse(JSON.stringify(carBufferRoutes));
		let resultCarBufferRoutes = [];
		let bufferSupVolume = 0;
		initBufferCars.forEach(function(itemCar){
			if (!itemCar.arriveTime) {
				itemCar.arriveTime = itemCar.time;
			}
		});
		initBufferCars = _.sortBy(initBufferCars, ['time', 'bufferNeedVolume'], ['asc', 'desc']);
		while (initBufferCars.length > 0) {
			// 取出当前到达时间最小的车
			let brt = initBufferCars.shift();
			let arriveTime = brt.arriveTime || brt.time;
			// 传入一个时间点获取bufferCars的量
			let bufferVolume = self.getBufferVolumeByTime( arriveTime, bufferCars, distances);
			// 这个时间点buffer的总需求量
			let totalNeedVolume = bufferSupVolume + brt.bufferNeedVolume;
			// 如果总需求量小于等于这个时间buffer能提供的量
			// console.log('=====',totalNeedVolume, bufferVolume)
			if (totalNeedVolume <= bufferVolume) {
				bufferSupVolume += brt.bufferNeedVolume;
				brt.waitTime = 0;
				resultCarBufferRoutes.push(brt);
			} else {
				// 需要进行时间延迟处理
				// console.log("Need delay process");
				let needTime = self.getBufferNeedTimeByVolume(totalNeedVolume, bufferCars, distances);
				// 如果在到达之前就能满足则等待时间为0，否则的话需要用needTime - brt.time;
				let waitTime = 0;
				if (needTime > brt.arriveTime) {
					waitTime = needTime - brt.arriveTime;
				}
				brt.waitTime = waitTime;
				bufferSupVolume += brt.bufferNeedVolume;
				resultCarBufferRoutes.push(brt);
				// 重新给剩下的时间点添加beforewait字段
			}
			// 更新剩下的车的到达时间
			let beforeWaitTime = _.sum(_.map(_.filter(resultCarBufferRoutes, function(item){
				return item.carCode === brt.carCode;
			}), 'waitTime'));
			initBufferCars.forEach(function(itemCar){
				if (itemCar.carCode === brt.carCode) {
					itemCar.arriveTime = itemCar.time + beforeWaitTime;
				}
			});
			// 重新排序
			initBufferCars = _.sortBy(initBufferCars, ['arriveTime', 'bufferNeedVolume'], ['asc', 'desc']);
			// console.log("--------------------------------message--------------------------------");
			// console.log(initBufferCars);
			// console.log("--------------------------------end--------------------------------");
		}
		// console.log(resultCarBufferRoutes)
		return resultCarBufferRoutes;
	},
	fixedBufferRoutes(carBufferRoutes, bufferCars, distances) {
		// carBufferRoute
		// { time: 32.7,
		//   routes: [ 'Supply1', 'P7', 'Buffer1' ],
		//   carCode: 'S1-C-1',
		//   bufferNeedVolume: 6.3 }
		// 会添加一个字段 waitTime
		if (!carBufferRoutes || !bufferCars || !distances) {
			return console.log(`fixedBufferRoutes Error`);
		}
		let self = this;
		let resultCarBufferRoutes = [];
		let bufferSupVolume = 0;

		carBufferRoutes.sort(function(a, b) {
			return a.time > b.time;
		});


		for (let i = 0; i < carBufferRoutes.length; i++) {
			let brt = carBufferRoutes[i];
			// 传入一个时间点获取bufferCars的量
			let bufferVolume = self.getBufferVolumeByTime(brt.time, bufferCars, distances);
			// 这个时间点buffer的总需求量
			let totalNeedVolume = bufferSupVolume + brt.bufferNeedVolume;
			// 如果总需求量小于等于这个时间buffer能提供的量
			// console.log(bufferSupVolume, brt.bufferNeedVolume,totalNeedVolume, bufferVolume, brt.time)
			if (totalNeedVolume <= bufferVolume) {
				bufferSupVolume += brt.bufferNeedVolume;
				brt.waitTime = 0;
				resultCarBufferRoutes.push(brt);
			} else {
				// 需要进行时间延迟处理
				// console.log("Need delay process");
				let needTime = self.getBufferNeedTimeByVolume(totalNeedVolume, bufferCars, distances);
				// 如果在到达之前就能满足则等待时间为0，否则的话需要用needTime - brt.time;
				let waitTime = 0;
				if (needTime > brt.time) {
					waitTime = needTime - brt.time;
				}
				brt.waitTime = waitTime;
				bufferSupVolume += brt.bufferNeedVolume;
				resultCarBufferRoutes.push(brt);
			}
		}
		return resultCarBufferRoutes;
	},
	fixWaitTimeForGoToBufferCars(hasGoToBufferCars, fixedBufferRoutes) {
		if (!hasGoToBufferCars ||  !fixedBufferRoutes ) {
			return console.log(`fixWaitTimeForGoToBufferCars Error,hasGoToBufferCars: ${hasGoToBufferCars}, fixedBufferRoutes: ${fixedBufferRoutes}`);
		}
		// 找出存在buffer的车辆
		let fixWaitTimeCars = [];
		hasGoToBufferCars.forEach(function(car) {
			let waitTimes = _.map(_.filter(fixedBufferRoutes, function(route){
				return route.carCode === car.carCode;
			}),"waitTime");
			car.waitTimes = waitTimes;
			// console.log(waitTimes)
			fixWaitTimeCars.push(car);
		});
		return fixWaitTimeCars;
	},
	getMaxTime(fixWaitTimeForGoToBufferCars, noBufferCars, distances, loopFlag) {
		let maxTime = 0;
		let self = this;
		let maxCar;
		let allBufferNeedVolume = 0
		fixWaitTimeForGoToBufferCars.forEach(function(car) {
			let routeTime = self.calcRoutesTime(car.arrives, distances);
			let waitTimes = _.sum(car.waitTimes);
			let totalTime = routeTime + waitTimes;
			if (totalTime > maxTime) {
				maxTime = totalTime;
				maxCar = car;
			}
			allBufferNeedVolume += _.sum(car.bufferNeedVolumes);
		});
		noBufferCars.forEach(function(car) {
			let routeTime = self.calcRoutesTime(car.arrives, distances);
			if (routeTime > maxTime) {
				maxTime = routeTime;
				maxCar = car
			}
		});
		if (!loopFlag) {
			console.log('buffer need：',allBufferNeedVolume);
			console.log('运行路程最大的那辆车：',maxCar);
			console.log('路径所需时间route time：',self.calcRoutesTime(maxCar.arrives, distances));
			console.log('等待所需时间buffer wait time：', _.sum(maxCar.waitTimes));
		}
		return maxTime;
	},
	/*
	[ { carCode: 'S2-C-1',
	    type: 'C',
	    load: 6.3,
	    ownerSupply: 'Supply2',
	    routes: [],
	    goBuffer: true },
	  { carCode: 'S2-C-2',
	    type: 'C',
	    load: 6.3,
	    ownerSupply: 'Supply2',
	    routes: [],
	    goBuffer: true } ]
	 */
	isAllFromOneSupPoint(bufferCars) {
		if (!Array.isArray(bufferCars)) {
			return {
				flag: false
			};
		}
		let supPointNames = _.map(bufferCars, 'ownerSupply');
		let names = [];
		supPointNames.forEach(function(item){
			if (names.indexOf(item) < 0) {
				names.push(item);
			}
		});
		if (names.length < 2) {
			return {
				supPointNames: names,
				flag: true,
			};
		}
		return {
			supPointNames: names,
			flag: false,
		};
	},
	getTotalBufferNeedVolume(carBufferRoutes, supPointName){
		let totalBufferVolume = 0;
		carBufferRoutes.forEach(function(car) {
			totalBufferVolume += car.bufferNeedVolume;
		});
		let supPoint = _.find(supPoints, function(point) {
			return point.name === supPointName;
		});
		if (!supPoint) {
			return false;
		}
		// 如果不能满足则进行下一次递归
		if (supPoint.volume < totalBufferVolume) {
			// console.log(supPoint.volume, totalBufferVolume)
			return false;
		}
		return true;
	},
	/*
	fixWaitTimeForGoToBufferCars: { carCode: 'S1-A-1',
    type: 'A',
    load: 9,
    ownerSupply: 'Supply1',
    routes: [ 'P6', 'P1' ],
    arrives: [ 'Supply1', 'P6', 'P1', 'Buffer1', 'P1', 'Buffer1', 'P1' ],
    volume: 0,
    supVolume: 21,
    notEnough: 0,
    lastFinshPoint: 'P1',
    bufferNeedVolumes: [ 9, 3 ],
    waitTimes: [ 25.900000000000006, 4.300000000000011 ] },
	noBufferCars:
	 */
	calcVolumeExceptTime(fixWaitTimeForGoToBufferCars, noBufferCars, distances){
		let result = 0;
		const self = this;
		fixWaitTimeForGoToBufferCars.forEach(function(car) {
			let arrives = car.arrives;
			// 找出剔除供应点hebuffer的点
			let filterArray = [config.bufferName, arrives[0]];
			let filterPoint = _.filter(arrives, function(item){
				if (filterArray.indexOf(item) < 0) {
					return true;
				}
				return false;
			});
			for (let j = 0; j < filterPoint.length; j++) {
				let route = filterPoint[j];
				// 计算出到达此点的需求量以及能提供的量
				let volume = car.perPointVolume[j];
				// 计算出到达此点的时间
				let routes = arrives.slice(0, _.indexOf(arrives, route, j) + 1);
				let time = self.calcRoutesTime(routes, distances);
				// 找出buffer, 需要加上在buffer等待的时间。
				let buffers = _.filter(routes, function(bufferPoint){
					if (bufferPoint === config.bufferName) {
						return true;
					}
					return false;
				});
				if (buffers.length > 0) {
					time += car.waitTimes[buffers.length - 1];
				}
				result += volume/time;
			}
		});

		noBufferCars.forEach(function(car) {
			let arrives = car.arrives;
			// 找出剔除供应点hebuffer的点
			let filterArray = [config.bufferName, arrives[0]];
			let filterPoint = _.filter(arrives, function(item){
				if (filterArray.indexOf(item) < 0) {
					return true;
				}
				return false;
			});
			for (let j = 0; j < filterPoint.length; j++) {
				let route = filterPoint[j];
				// 计算出到达此点的需求量以及能提供的量
				let volume = car.perPointVolume[j];
				// 计算出到达此点的时间
				let routes = arrives.slice(0, _.indexOf(arrives, route, j) + 1);
				let time = self.calcRoutesTime(routes, distances);
				result += volume/time;
			}
		});
		return result;
	},
	calcRouteSafeIndexes(routes, safeIndexes) {
		// 给出一个routes 计算这个routes的时间
		// [ 'Supply2', 'P8', 'Buffer1', 'P8', 'P10', 'Buffer1', 'P10', 'P9' ]
		if (!_.isArray(routes)) {
			return console.log(`routes: ${routes} Error`);
		}
		if (routes.length < 2) {
			console.log("routes length Error, routes length must greater than 2, routes:${routes}");
			return 0;
		}
		let self = this;
		let indexes = 1;
		for (let i = 1; i < routes.length; i++) {
			let safeIndex = self.getDistance(routes[i-1], routes[i], safeIndexes);
			if (!safeIndex) {
				console.log(`Error, calcRoutesTime, safeIndex: ${safeIndex}, i-1: ${routes[i-1]}, i:${routes[i]}`);
			} else {
				indexes *= safeIndex;
			}
		}
		return indexes;
	},
	calcSafeIndexes(fixWaitTimeForGoToBufferCars, noBufferCars, safeIndexes){
		// 根据路径进行计算除safeIndexes
		const self = this;
		let carsIndexes = [];
		fixWaitTimeForGoToBufferCars.forEach(function(car){
			let indexes = self.calcRouteSafeIndexes(car.arrives, safeIndexes);
			carsIndexes.push(indexes);
		});
		noBufferCars.forEach(function(car) {
			let noBuffIndexes = self.calcRouteSafeIndexes(car.arrives, safeIndexes);
			carsIndexes.push(noBuffIndexes);
		});
		return _.min(carsIndexes);
	}
}

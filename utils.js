var _ = require('lodash')
var Converter = require("csvtojson").Converter;
var converter = new Converter({});
var combinFlag = "-";
var bufferName = "Buffer1";

module.exports = {
	csvToJson(fileUrl, callback) {
		if (!_.isString(fileUrl) || !_.isFunction(callback)) {
			return console.log(`文件名:${fileUrl}, 回调函数${callback}`);
		}
		converter.fromFile(fileUrl ,function(err,result){
			callback(err, result);
		});
	},
	initPointDistance(disArr, mainKeyName){
		if (!_.isArray(disArr)) {
			return console.log((`${disArr}不是一个数组`));
		}
		var name = mainKeyName || "name";
		var result = {};
		var len = disArr.length;
		for (var i = 0; i < len; i++) {
			var item = disArr[i];
			var firstKey = item[name].toString();
			delete item[name];
			var allKeys = _.keys(item);
			allKeys.forEach(function(key, index){
				var val = item[key];
				var key = key.toString();
				if (firstKey === key) {
					val = 0;
				}
				if (val === "") {
					var mirrorKey = key + combinFlag + firstKey;
					val = result[mirrorKey];
				}
				var combinKey = firstKey + combinFlag + key;
				result[combinKey] = val;
			});
		}
		return result;
	},
	getDistance(firstKey, lastKey, distances) {
		if (!firstKey || !lastKey || !distances) {
			return console.log(`firstKey:${firstKey},lastKey: ${lastKey},distances:${distances}`);
		}
		var key = firstKey + combinFlag + lastKey;
		var disVal = distances[key];
		if (!disVal && disVal !== 0) {
			var reverseKey = lastKey + combinFlag + firstKey;
			disVal = distances[reverseKey];
		}
		if (!disVal && disVal !== 0) {
			console.log(`get distances key Error, firstKey:${firstKey},lastKey: ${lastKey}`);
		}
		return disVal;
	},
	initCarsRoutes(cars, initResult) {
		if (!cars || !initResult) {
			return console.log(`Error: cars: ${cars}, initResult: ${initResult}`);
		}
		// 遍历所有车辆，然后根据carCode找出初始化结果中该车需要到达的点
		// 如果没有找到，则该车为到buffer点的车
		cars.forEach(function(car, index){
			var points = _.filter(initResult, function(points) {
				return car.carCode === points.carCode;
			});
			// 如果没有找到则标志为到buffer的车辆
			if (points.length === 0) {
				car.routes = [];
				car.goBuffer = true;
				return;
			}
			// 对到达点更具 step 字段进行排序
			points.sort(function(itema, itemb){
				return itema.step > itemb.step;
			});
			var routes = _.map(points, 'pCode');
			car.routes = routes;
		});
		return cars;
	},
	calcCarTouchBuffer(car, points, distances) {
		if (!car || !points || !distances) {
			return console.log(`calcCarTouchBuffer Error, car: ${car}, points: ${points}, distances: ${distances}`);
		}
		var self = this;
		var routes = car.routes;
		if (!car.goBuffer && (!routes || routes.length < 1)) {
			return console.log(`car: ${car.carCode}, routes Error`);
		}
		// 如果在起始点出发时则为零，设置起始点为第一个到达点, 并且设置其初始化的的数量volume
		if (!car.arrives || car.arrives.length === 0) {
			car.arrives = [car.ownerSupply];
			car.volume = car.load;
			car.supVolume = 0;
			car.notEnough = 0;
			car.lastFinshPoint = car.ownerSupply;
			car.bufferNeedVolumes = [];
		}
		for (var i = 0; i < 7; i++) {
			// 如果最后到达点等于routes的最后一个到达点，且notEnough等于0 则结束循环
			var isLastPoint = self.isLastPoint(car);
			if (isLastPoint && car.notEnough === 0) {
				break;
			} 
			// 如果存在notEnough 大于0，则说明此车仔这个点需要到达buffer去获取物资，不继续进行下一步运输。
			if (car.notEnough > 0) {
				// 需要去一次buffer点进行装载，假设不需要等待，等待时间在最后结果进行添加
				car  = self.goToBuffer(car);
			} else{
				var route = self.getNextRoute(car);
				var needVolume = _.map(_.filter(points, function(point){
					return point.code === route;
				}), 'needVolume')[0];
				// 更新car的volume
				car = self.updateCarVolume(car, needVolume, route);
			}
		}
		return car;
	},
	getNextRoute(car) {
		var index = car.routes.indexOf(car.lastFinshPoint);
		return car.routes[index + 1];
	},
	isLastPoint(car) {
		return car.routes[car.routes.length - 1] === car.arrives[car.arrives.length - 1];
	},
	updateCarVolume(car, needVolume, route) {
		if (car.volume >= needVolume) {
			car.arrives.push(route);
			car.supVolume += needVolume;
			car.volume -= needVolume;
			car.lastFinshPoint = route;
			return car;
		} 
		// 当车上的数量小于需求量时则卸载下当前的量，设置notEnough的量
		car.arrives.push(route);
		car.supVolume += car.volume;
		car.notEnough = needVolume - car.volume;
		car.volume = 0;
		return car;
	},
	goToBuffer(car) {
		var self = this;
		var isLastPoint = self.isLastPoint(car);
		var isLoadGreaterNeed = car.load > car.notEnough;
		// 判定是否为最后一个装载点，如果是装载最后一个点且需求量小于最大装载量则只装载最后一个点的需求量
		car.arrives.push(bufferName);
		var route = car.arrives[car.arrives.length - 2];
		car.arrives.push(route);
		if (isLoadGreaterNeed) {
			// 装载量大于此点的需求，并且为最后一个运输点
			if (isLastPoint) {
				car.volume = 0;
				car.supVolume += car.notEnough;
				car.lastFinshPoint = route;
				car.bufferNeedVolumes.push(car.notEnough);
				car.notEnough = 0;
			} else {
				car.volume = car.load - car.notEnough;
				car.supVolume += car.notEnough;
				car.notEnough = 0;
				car.lastFinshPoint = route;
				car.bufferNeedVolumes.push(car.load);
			}
		} else {
			car.volume = car.load;
			car.supVolume += car.volume;
			car.notEnough -= car.load; 
			car.bufferNeedVolumes.push(car.load);
		}
		return car;
	},
	findWays(points, pointCars, distances) {
		var self = this;
		if (!_.isArray(points) || !_.isArray(pointCars) || _.isArray(distances)) {
			return console.log(`输入错误: points:${points}, pointCars: ${pointCars}, distances:${distances}`);
		}
		// 找出各车的第一次到达buffer时候的状态
		var goCars = [];
		pointCars.forEach(function(car, index){
			var routeCar = self.calcCarTouchBuffer(car, points, distances);
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
		var self = this;
		var times = 0;
		for (var i = 1; i < routes.length; i++) {
			var time = self.getDistance(routes[i-1], routes[i], distances);
			if (!time) {
				console.log(`Error, calcRoutesTime, time: ${time}`);
			} else {
				times += time;
			}
		}
		return times;
	},
	getBufferByRoutes(car, distances) {
		var self = this;
		var bufferRoute = [];
		var routes = car.arrives;
		var bufferCount = 0;
		for (var i = 0; i < routes.length; i++) {
			var route = routes[i];
			if (route === bufferName) {
				bufferCount ++;
				var rts =  routes.slice(0, i+1);
				var time = self.calcRoutesTime(rts, distances)
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
		var self = this;
		var bufferRoutes = [];
		for (var i = 0; i < hasGoToBufferCars.length; i++) {
			var car = hasGoToBufferCars[i];
			// 找到所有到达buffer的点，及其路由
			var bfRoutes = self.getBufferByRoutes(car, distances);
			bufferRoutes = bufferRoutes.concat(bfRoutes);
		}
		// 按照时间排序（升序）
		bufferRoutes.sort(function(a, b){
			return a.time > b.time;
		});
		return bufferRoutes;
	},
	initBufferCars(bufferCars, distances) {
		// 添加 goBufferTime到car对象上面
		if (!_.isArray(bufferCars)) {
			return console.log(`Error initBufferCars, bufferCars${bufferCars}`);
		}
		var self = this;
		var initBufferCars = [];
		bufferCars.forEach(function(car){
			// getDistance
			var dis = self.getDistance(car.ownerSupply, bufferName, distances);
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
		var count = 0;
		if (time < bufferCar.goBufferTime) {
			return count;
		}
		count ++;
		var lessTime = time - bufferCar.goBufferTime;
		var moreCount = Math.floor(lessTime/bufferCar.goBufferTime);
		count += moreCount;
		return count;
	},
	getBufferVolumeByTime(time, bufferCars, distances) {
		// initBufferCars[{car.goBufferTime}]
		var self = this;
		var initBufferCars = self.initBufferCars(bufferCars, distances);
		var bufferVolume = 0;
		initBufferCars.forEach(function (bufferCar) {
			var count = self.getCountByTime(time, bufferCar);
			var volume = count * bufferCar.load;
			bufferVolume += volume;
		});
		// bufferVolume 为到某个时间点的量
		return bufferVolume;
	},
	getBufferNeedTimeByVolume(totalNeedVolume, bufferCars, distances){
		if (!totalNeedVolume || !bufferCars || !distances) {
			return console.log(`getBufferNeedTimeByVolume Error`);
		}
		var self = this;
		var initBufferCars = self.initBufferCars(bufferCars, distances);
		// 找出运输量最小的那辆车
		var minLoadCar = _.minBy(initBufferCars, function(car) {
			return car.load;
		});
		// 计算最小的那辆车需要走多少次
		var maxCount = Math.ceil(totalNeedVolume / minLoadCar.load);
		for (var i = 0; i < maxCount; i++) {
			var time = (i + 1) * minLoadCar.goBufferTime;
			var volume = self.getBufferVolumeByTime(brt.time, bufferCars, distances);

		}
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
		var self = this;
		var resultCarBufferRoutes = [];
		var bufferSupVolume = 0;
		for (var i = 0; i < carBufferRoutes.length; i++) {
			var brt = carBufferRoutes[i];
			// 传入一个时间点获取bufferCars的量
			var bufferVolume = self.getBufferVolumeByTime(brt.time, bufferCars, distances);
			// 这个时间点buffer的总需求量
			var totalNeedVolume = bufferSupVolume + brt.bufferNeedVolume;
			// 如果总需求量小于等于这个时间buffer能提供的量
			// console.log(bufferSupVolume, brt.bufferNeedVolume,totalNeedVolume, bufferVolume, brt.time)
			if (totalNeedVolume <= bufferVolume) {
				bufferSupVolume += brt.bufferNeedVolume;
				brt.waitTime = 0;
				resultCarBufferRoutes.push(brt);
			} else {
				// 需要进行时间延迟处理
				console.log("Need delay process");
				var needTime = self.getBufferNeedTimeByVolume(totalNeedVolume, bufferCars, distances);
				// ------
				// waitTime = needTime - brt.time
				// 
				brt.waitTime = waitTime;
				resultCarBufferRoutes.push(brt);
			}
		}
		return resultCarBufferRoutes;
	}
}


















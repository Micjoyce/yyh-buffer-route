var _ = require('lodash')
var utils = require('./utils');
var config = require('./config');
// 路程数据需要定时给出的
var disCsvName = './distances.csv';

// 基本配置文件
var bufferName = config.bufferName;

var itResult = [];

utils.csvToJson(disCsvName, function(err, jsonDis){
	// 初始化距离数据
 	var distances = utils.initPointDistance(jsonDis);

	// 生成随机解
	// initResult可以动态给定达到优化的过程
	var initResult = require('./initResult');

	// 根据初始解进行迭代
	var len = 50;
	for (var i = 0; i < len; i++) {
		// cars,initResult,points可以动态给定达到优化的过程
		var cars = require('./cars');
		var points = require('./points');

		initResult = utils.iterationResult(initResult, cars);
		console.log(initResult)
		// init cars route,设置各车所要走的路径
		var hello = utils.initCarsRoutes(cars, initResult);

		var pointCars = _.filter(cars,function(car){
			return !car.goBuffer;
		});
		var bufferCars = _.filter(cars, function(car){
			return car.goBuffer;
		});

		// 找出所有车的路径
		var goCars = utils.findWays(points, pointCars, distances);
		// 找出没有到过buffer的cars
		var noBufferCars = _.filter(goCars, function(car) {
			return car.arrives.indexOf(bufferName) === -1;
		});
		// 找出没有到过buffer的cars
		var hasGoToBufferCars = _.filter(goCars, function(car) {
			return car.arrives.indexOf(bufferName) !== -1;
		});
		// 获取到达buffer的routes数组，并按照升序排序
		var carBufferRoutes = utils.getBuffersByCar(hasGoToBufferCars, distances);
		// 开始计算各车到buffer的时间序列
		// buffer 点的处理
		var fixedBufferRoutes = utils.fixedBufferRoutes(carBufferRoutes, bufferCars, distances);
		// 将各个buffer的等待时间添加大 hasGoToBufferCars 对象中

		var fixWaitTimeForGoToBufferCars = utils.fixWaitTimeForGoToBufferCars(hasGoToBufferCars, fixedBufferRoutes);
		// 数据结构
		// { carCode: 'S1-A-1',
		// type: 'A',
		// load: 9,
		// ownerSupply: 'Supply1',
		// routes: [ 'P5', 'P3', 'P1' ],
		// arrives: [ 'Supply1', 'P5', 'P3', 'P1', 'Buffer1', 'P1', 'Buffer1', 'P1' ],
		// volume: 0,
		// supVolume: 21,
		// notEnough: 0,
		// lastFinshPoint: 'P1',
		// bufferNeedVolumes: [ 9, 3 ],
		// waitTimes: [ 0.29999999999999716, 0 ] }
		// 输出结果，计算出总时间, 总时间只和需要达到受灾点的时间有关。
		var maxTime = utils.getMaxTime(fixWaitTimeForGoToBufferCars, noBufferCars, distances);
		itResult.push(maxTime)
	}
	console.log(itResult)
});

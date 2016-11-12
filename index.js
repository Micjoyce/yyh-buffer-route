var utils = require('./utils');
var cars = require('./cars');
var initResult = require('./initResult');
var points = require('./points');
var _ = require('lodash')

var disCsvName = './distances.csv';


// init cars route,设置各车所要走的路径
cars = utils.initCarsRoutes(cars, initResult);

utils.csvToJson(disCsvName, function(err, jsonDis){
	var resultCars = [];
	 // 初始化距离数据
	var distances = utils.initPointDistance(jsonDis);

	var pointCars = _.filter(cars,function(car){
		return !car.goBuffer;
	});
	var bufferCars = _.filter(cars, function(car){
		return car.goBuffer;
	});

	// 找出所有车的路径
	var goCars = utils.findWays(points, pointCars, distances);
	// 开始计算各车到buffer所需要增加的时间

	// // 找出不需要继续进行的车辆,标志为notEnough等于0的车辆
	// var finishCars = _.filter(goCars, function(car) {
	// 	return car.notEnough === 0;
	// });
	// //将不需要继续进行的车辆保存在resultCars中
	// var needToGoCars = _.filter(goCars, function(car) {
	// 	return car.notEnough > 0;
	// });
});

// var stopFlag = false;
// while(stopFlag === false){
// // 	//执行一次循环计算出所有车的状态之，并且更新状态树
	
// // 	// 在函数中遍历所有车辆更新状态，以及point，和initbuffer的状态。

// }
'use strict';
let _ = require('lodash')
let utils = require('./utils');
let ANutils = require('./annealAlgorithm');
let config = require('./config');
let supPoints = require('./supPoints');
let stopTime = config.stopTime;

// 配置环境数据
console.log(`---------------buffer点:${config.bufferName}------------------`);
console.log(`---------------起始退火温度:${config.annealDegree}------------------`);
console.log(`---------------退火系数:${config.annealFactor}------------------`);
console.log(`---------------迭代次数:${config.iteratorTimes}------------------`);
console.log(`---------------相同次数:${config.stopTime}------------------`);

// 路程数据
let disCsvName = './distances.csv';
let safeindexesFile = './safeindexes.csv';
// 初始化车辆
let initCars = require('./cars');
// 初始化受灾点
let points = require('./points');

// 基本配置文件
let bufferName = config.bufferName;

let superLogResult = {};
let countTest = {
  a: 1
}

let allResult = {}; // 保存输出结果

// initResult可以动态给定达到优化的过程
let initResult = require('./initResult');

utils.csvToJsonTwo(safeindexesFile, function(err, joinIndexes) {
    let safeIndexes = utils.initPointDistance(joinIndexes);
    utils.csvToJson(disCsvName, function(err, jsonDis) {
        let distances = utils.initPointDistance(jsonDis);
        // 生成随机解
        let finalResult = {};
        let lastTimeResult = {};
        let changeDegreeCount = 0;
        let loopFlag = true;
        let annealDegree = config.annealDegree;
        let annealResult;
        while(loopFlag) {
            // 退火算法执行
            if (finalResult.time) {
                changeDegreeCount ++;
                // console.log(finalResult.time, '====');
                annealResult = ANutils.annealAlgorithm(finalResult, annealResult, initResult, annealDegree)
                // console.log( annealResult.time, '-------');
            }

            if (stopTime < 0) {
                // superLogResult
                console.log('往buffer运输的车辆:', superLogResult.bufferCars);
                console.log('需要去buffer的车辆:', superLogResult.fixWaitTimeForGoToBufferCars);
                console.log('不需要去buffer的车辆:', superLogResult.noBufferCars)
                    
                // 输出结果
                console.log(annealResult);
                // 停止迭代
                return;
            }

            if (changeDegreeCount >= config.iteratorTimes) {
                // 降低退火温度
                annealDegree = annealDegree * config.annealFactor;
                changeDegreeCount = 0;
                // 如果退火一次将次数递减一下
                stopTime--;
                // 输出迭代次数
                if (stopTime % 50 === 0) {
                    console.log(`迭代次数: ${stopTime}`);
                }
            }

            if (annealResult && annealResult.points) {
                initResult = utils.iterationResult(annealResult.points, initCars);
                while (_.uniq(_.map(initResult, "carCode")).length === initCars.length) {
                    initResult = utils.iterationResult(annealResult.points, initCars);
                }
            }

            // init cars route,设置各车所要走的路径
            let cars = utils.initCarsRoutes(initCars, initResult);

            let pointCars = _.filter(cars, function(car) {
                return !car.goBuffer;
            });
            let bufferCars = _.filter(cars, function(car) {
                return car.goBuffer;
            });
            // 找出所有车的路径
            let goCars = utils.findWays(points, pointCars, distances);

            // 找出没有到过buffer的cars
            let noBufferCars = _.filter(goCars, function(car) {
                return car.arrives.indexOf(bufferName) === -1;
            });
            // 找出没有到过buffer的cars
            let hasGoToBufferCars = _.filter(goCars, function(car) {
                return car.arrives.indexOf(bufferName) !== -1;
            });
            // console.log(noBufferCars.length, hasGoToBufferCars.length, goCars.length, pointCars.length, bufferCars.length);
            // 获取到达buffer的routes数组，并按照升序排序
            let carBufferRoutes = utils.getBuffersByCar(hasGoToBufferCars, distances);

            // 判断是否都是从一个点运输供给给buffer点，如果是的话，需要做判断，在做getneefrombuffer是需要做一个判断，是否本点有这些量
            let isAllFromOneSupPoint = utils.isAllFromOneSupPoint(bufferCars);
            // 如果都是从同一个节点出来的则需要判断是否能满足所有的bufferneedvolume
            let canSupForBuffer = true;
            if (isAllFromOneSupPoint.flag) {
                canSupForBuffer = utils.getTotalBufferNeedVolume(carBufferRoutes, isAllFromOneSupPoint.supPointNames[0]);
            }
            // 如果不能满足到达buffer的点，进行下一次迭代
            if (!canSupForBuffer) {
                continue;
            }
            // 开始计算各车到buffer的时间序列
            // buffer 点的处理
            let fixedBufferRoutes = utils.fixedBufferRoutes(carBufferRoutes, bufferCars, distances);
            // 将各个buffer的等待时间添加大 hasGoToBufferCars 对象中

            let fixWaitTimeForGoToBufferCars = utils.fixWaitTimeForGoToBufferCars(hasGoToBufferCars, fixedBufferRoutes);

            // 输出结果，计算出总时间, 总时间只和需要达到受灾点的时间有关。
            let maxTime = Number(utils.getMaxTime(fixWaitTimeForGoToBufferCars, noBufferCars, distances, loopFlag).toFixed(config.digital));


            // 赋值给结果
            finalResult.time = maxTime;
            finalResult.points = initResult;

            allResult = finalResult;

            // 量除于时间
            allResult.volueDivideTime = utils.calcVolumeExceptTime(fixWaitTimeForGoToBufferCars, noBufferCars, distances);
             // 危险性

            allResult.safeIndex = utils.calcSafeIndexes(fixWaitTimeForGoToBufferCars, noBufferCars, safeIndexes);

            // 输出结果
            allResult.calcResult = allResult.time * config.timeIndex - allResult.volueDivideTime * config.volueDivideTimeIndex - allResult.safeIndex * config.safeIndex;

            // console.log(allResult);

            // 退火算法赋值
            superLogResult.bufferCars = bufferCars;
            superLogResult.fixWaitTimeForGoToBufferCars = fixWaitTimeForGoToBufferCars;
            superLogResult.noBufferCars = noBufferCars;
        }
    });
});
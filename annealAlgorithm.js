var _ = require('lodash')
var config = require('./config');

module.exports = {
	// 退火算法规则
	// 按照一定的概率接受某个结果 e(-(T前-T后)/260)的温度
	annealAlgorithm(finalResult, lastTimeResult, initResult, degree) {
		// if (!lastTimeResult.time || !finalResult.time) {
		// 	return console.log(`annealAlogrithm Error: finalResult:${finalResult}, lastTimeResult:${lastTimeResult}`)
		// }
		// 如果这一次的计算结果好，则使用此次的计算结果
		var self = this;
		if (finalResult.time <= lastTimeResult.time) {
			return finalResult;
		} 
		// 如果此次比之前的结果大，就按照一定的概率接受某个结果 e(-(T前-T后)/260)的温度
		var powNum = -(finalResult.time - lastTimeResult.time)/degree;
		var chancePercent = Math.pow(Math.E, powNum);
		var acceptFinaResult = self.acceptChance(chancePercent);
		if (acceptFinaResult) {
			return finalResult;
		}
		return lastTimeResult;
	},
	// 以一定的概率接受
	acceptChance(chancePercent){
		if (!chancePercent && chancePercent !== 0) {
			console.log(`acceptChance: chancePercent${chancePercent}`);
		}
		var randomNum = Math.random();
		if (chancePercent < randomNum) {
			return true;
		}
		return false;
	},
	stopDirection(timeSerie) {
		var stopTime = config.stopTime;
		if (!_.isArray(timeSerie)) {
			return console.log("stopDirection Error, timeSerie: ${timeSerie}");
		}
		if (timeSerie.length < stopTime) {
			return true;
		}
		var stop = false;
		var seire = _.takeRight(timeSerie, config.stopTime);
		var initArr = seire[0];
		for (var i = 1; i < seire.length; i++) {
			var time = seire[i];
			if (initArr === time) {
				stop = false;
			} else {
				stop = true;
			}
			if (stop === true) {
				return true;
				break;
			}
		}
		return false;
	}
}

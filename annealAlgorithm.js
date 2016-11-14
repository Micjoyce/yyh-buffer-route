var _ = require('lodash')
var config = require('./config');

module.exports = {
	// 退后算法规则
	// 按照一定的概率接受某个结果 e(-(T前-T后)/260)的温度
	annealAlgorithm(finalResult, lastTimeResult, initResult, degree) {
		// if (!lastTimeResult.time || !finalResult.time) {
		// 	return console.log(`annealAlogrithm Error: finalResult:${finalResult}, lastTimeResult:${lastTimeResult}`)
		// }
		// 如果这一次的计算结果好，则使用此次的计算结果
		var self = this;
		if (finalResult.time <= lastTimeResult.time) {
			return finalResult.points;
		}
		// 如果此次比之前的结果大，就按照一定的概率接受某个结果 e(-(T前-T后)/260)的温度
		var powNum = -(finalResult.time - lastTimeResult.time)/degree;
		var chancePercent = Math.pow(Math.E, powNum);
		var acceptFinaResult = self.acceptChance(chancePercent);
		if (acceptFinaResult) {
			return finalResult.points;
		}
		return lastTimeResult.points;
	},
	// 以一定的概率接受
	acceptChance(chancePercent){
		if (!chancePercent) {
			console.log(`acceptChance: chancePercent${chancePercent}`);
		}
		var randomNum = Math.random();
		if (chancePercent < randomNum) {
			return true;
		}
		return false;
	}
}
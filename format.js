var points = require('./points');
var sum = 0;
points.forEach(function(item, i){
    sum += item.needVolume;
})
console.log(sum);
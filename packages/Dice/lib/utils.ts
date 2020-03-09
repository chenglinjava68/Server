import _ from 'lodash';

/**
 * 在一定范围内取随机值
 * @param maxPoint 最大点数
 * @param minPoint 最小点数
 */
export function rollPoint(maxPoint: number, minPoint = 1) {
  maxPoint = parseInt(String(maxPoint));
  minPoint = parseInt(String(minPoint));
  if (maxPoint <= 1) {
    maxPoint = 100;
  }
  if (maxPoint < minPoint) {
    maxPoint = minPoint + 1;
  }

  var range = maxPoint - minPoint + 1;
  var rand = Math.random();
  return minPoint + Math.floor(rand * range);
}

interface RollRes {
  str: string;
  value: number;
}
/**
 * 投骰
 * @param requestStr 投骰表达式
 */
export function roll(requestStr: string): RollRes {
  const pattern = /(\d*)\s*d\s*(\d*)/gi;

  requestStr = requestStr.replace(/[^\dd\+-\/\*\(\)]+/gi, ''); //去除无效或危险字符
  const express = requestStr.replace(pattern, function(tag, num, dice) {
    num = num || 1;
    dice = dice || 100;
    const res = [];
    for (var i = 0; i < num; i++) {
      res.push(rollPoint(dice));
    }

    if (num > 1) {
      return '(' + res.join('+') + ')';
    } else {
      return res.join('+');
    }
  });

  if (_.isEmpty(requestStr) || _.isEmpty(express)) {
    throw new Error('invalid request');
  }

  const result = eval(express);
  const str = requestStr + '=' + express + '=' + result;
  return {
    str,
    value: result,
  };
}
